import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Node.js runtime required for pdf-parse (not edge-compatible)
export const runtime = "nodejs";

const ALLOWED_PROGRAMS = [
  "MePower™",
  "Inner Power™",
  "MindPower™",
  "DreamPower™",
  "Slaying Dragons™",
];

interface QualityReport {
  charCount: number;
  estimatedPages: number;
  qualityScore: number;
  quality: "excellent" | "good" | "fair" | "poor";
  headingCount: number;
  frameworkCount: number;
  exerciseCount: number;
  detectedTerminology: string[];
  mightBeScanned: boolean;
  textPreview: string;
  warnings: string[];
}

function analyzeQuality(text: string): QualityReport {
  const charCount = text.length;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Detect headings: lines with caps, markdown #, or ending in ':'
  const headings = lines.filter(
    l => /^#+\s/.test(l) || /^[A-Z][A-Z\s\-]{4,}$/.test(l) || (l.endsWith(":") && l.length < 80)
  );

  // Frameworks / structured methods
  const frameworkMatches = (text.match(
    /\b(step \d|phase \d|\d\.\s+[A-Z]|framework|model|system|process|method|approach|technique|strategy|pillar|principle|stage)\b/gi
  ) || []).length;

  // Exercises / actions
  const exerciseMatches = (text.match(
    /\b(exercise|activity|practice|try this|do this|action|homework|assignment|task|challenge|reflection|worksheet)\b/gi
  ) || []).length;

  // Key terminology (title-case two-word phrases)
  const termMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
  const detectedTerminology = [...new Set(termMatches)].slice(0, 12);

  // Quality scoring
  let qualityScore = 0;
  if (charCount > 8000) qualityScore += 30;
  else if (charCount > 3000) qualityScore += 22;
  else if (charCount > 1000) qualityScore += 12;
  else if (charCount > 500) qualityScore += 6;

  if (headings.length >= 5) qualityScore += 20;
  else if (headings.length >= 2) qualityScore += 12;

  if (frameworkMatches >= 5) qualityScore += 20;
  else if (frameworkMatches >= 2) qualityScore += 12;

  if (exerciseMatches >= 4) qualityScore += 15;
  else if (exerciseMatches >= 1) qualityScore += 8;

  if (detectedTerminology.length >= 6) qualityScore += 15;
  else if (detectedTerminology.length >= 2) qualityScore += 8;

  const quality: QualityReport["quality"] =
    qualityScore >= 70 ? "excellent" :
    qualityScore >= 50 ? "good" :
    qualityScore >= 28 ? "fair" : "poor";

  const avgCharsPerLine = charCount / Math.max(lines.length, 1);
  const mightBeScanned = charCount < 500 || avgCharsPerLine < 15;

  const estimatedPages = Math.max(1, Math.round(charCount / 2000));

  const warnings: string[] = [];
  if (mightBeScanned) {
    warnings.push(
      "This PDF may be image-based (scanned). Text extraction was limited. Use an OCR tool to convert it before uploading."
    );
  }
  if (quality === "poor") {
    warnings.push(
      "This PDF may not provide enough curriculum content for high-quality scripts. Upload more detailed course materials."
    );
  }
  if (quality === "fair") {
    warnings.push("Curriculum extraction is minimal. Adding more detailed notes will improve script quality.");
  }

  return {
    charCount,
    estimatedPages,
    qualityScore,
    quality,
    headingCount: headings.length,
    frameworkCount: frameworkMatches,
    exerciseCount: exerciseMatches,
    detectedTerminology,
    mightBeScanned,
    textPreview: text.slice(0, 400).replace(/\s+/g, " ").trim(),
    warnings,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("program_knowledge")
    .select("id, program_name, file_name, char_count, indexed_at, created_at")
    .eq("user_id", user.id)
    .order("program_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, { limit: 20, windowMs: 3600000 }).ok)
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const programName = formData.get("program_name") as string | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!programName || !ALLOWED_PROGRAMS.includes(programName))
    return NextResponse.json({ error: "Invalid program_name" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf"))
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });

  // Extract text from PDF
  let extractedText = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Dynamic import avoids the pdf-parse test-file side-effect at build time
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
      buffer: Buffer
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    extractedText = result.text.trim();
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      { error: "Could not extract text from PDF. Make sure it is a text-based (not scanned) PDF." },
      { status: 422 }
    );
  }

  if (!extractedText || extractedText.length < 50) {
    return NextResponse.json(
      { error: "PDF appears to have no readable text. Upload a text-based PDF." },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("program_knowledge")
    .upsert(
      {
        user_id: user.id,
        program_name: programName,
        file_name: file.name,
        extracted_text: extractedText,
        char_count: extractedText.length,
        indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_name" }
    )
    .select("id, program_name, file_name, char_count, indexed_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const quality = analyzeQuality(extractedText);

  return NextResponse.json({ ...data, quality }, { status: 201 });
}
