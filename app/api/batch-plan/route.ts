import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = 'edge';
export const maxDuration = 60;

// Fixed weekly program distribution — NEVER changes
// 7 TikToks: Mon→MePower, Tue→Inner Power, Wed→MePower, Thu→Inner Power,
//             Fri→MindPower, Sat→DreamPower, Sun→Slaying Dragons
// YouTube: MePower™ (flagship, highest lead-conversion)
const TIKTOK_PROGRAM_ORDER = [
  "MePower™",        // Mon
  "Inner Power™",    // Tue
  "MePower™",        // Wed
  "Inner Power™",    // Thu
  "MindPower™",      // Fri
  "DreamPower™",     // Sat
  "Slaying Dragons™", // Sun
] as const;

const YOUTUBE_PROGRAM = "MePower™";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const PROGRAM_FALLBACKS: Record<string, { hook: string; problem: string; reframe: string; teaching: string; close: string }> = {
  "MePower™": {
    hook: "Your child tried something new, couldn't get it first try, and said 'I can't do this.' You told them to keep going. They shut down.",
    problem: "Every time a child walks away from a challenge, they build a story: 'I'm someone who gives up.' That story, if unchallenged, follows them into adulthood.",
    reframe: "Next time your child says 'I can't', don't say 'yes you can.' Say: 'What's one tiny step you could try?' That shifts their brain from shutdown to movement. Try it today.",
    teaching: "That tip works for one moment. But there are four deeper layers — identity, self-talk, challenge tolerance, and internal belief — that all need to shift for this to become permanent. That's what MePower™ is built to work through.",
    close: "If you used that and want the complete system for your child, MePower™ is where we build all of it together.",
  },
  "Inner Power™": {
    hook: "Your child is completely different around their friends. At home — one person. With their group — someone you barely recognise.",
    problem: "A child without a clear identity follows whoever pulls hardest — and that becomes very dangerous as they get older.",
    reframe: "Ask your child this Sunday: 'What's one decision you made this week that was yours — not your friends'?' That question starts building the muscle of self-direction.",
    teaching: "That question plants a seed. But building a true identity — values, standards, who they are when no one's watching — takes five specific practices done consistently. Inner Power™ teaches all five.",
    close: "If you want your child to hold their ground regardless of who they're with, Inner Power™ was made for this.",
  },
  "MindPower™": {
    hook: "Your child failed something and said 'I'm stupid.' You said 'no you're not.' They smiled. Then said it again the following week.",
    problem: "When we immediately contradict a child's self-label, they learn they need rescuing from the feeling. The root belief never shifts.",
    reframe: "Next time your child says 'I'm stupid', don't argue. Ask: 'What does this tell you about what to try differently?' That reframes failure as information instead of identity.",
    teaching: "That reframe helps in the moment. But a fixed mindset has four layers underneath it. MindPower™ works through all four — and parents who go through it say their child's relationship with difficulty completely changed.",
    close: "If your child has decided something untrue about themselves, MindPower™ is where that story gets rewritten.",
  },
  "DreamPower™": {
    hook: "Ask your child what they want to do with their life. Watch their face. Do they light up — or shrug and look away?",
    problem: "A child with no vision drifts toward whatever is loudest — screens, the wrong crowd, the easiest path. Every year without direction, the drift goes deeper.",
    reframe: "Tonight give your child 10 minutes. Ask: 'If you could be great at one thing by next year, what would it be?' Write it down together. Don't judge it. That's how vision begins.",
    teaching: "That exercise plants a seed. Growing it into real motivation — habits, daily rituals, a reason to choose effort — takes a full system. That's DreamPower™.",
    close: "If your child is drifting and you're ready to change that, DreamPower™ is where direction gets built.",
  },
  "Slaying Dragons™": {
    hook: "There was a school event, a new situation, a chance to try something different. Your child said 'I don't want to go.' You let them stay. It felt like kindness.",
    problem: "Every time a child avoids a fear and the avoidance works, they learn: fear means stop. The world gets smaller. What they're willing to try gets fewer.",
    reframe: "Next time your child says 'I don't want to try', say: 'Let's do 10 seconds of brave. Just 10 seconds.' Count with them. That's how courage gets built.",
    teaching: "Ten seconds works once. Building a child who faces hard things consistently requires a full framework: fear mapping, brave steps, courage evidence, and belief reset. Slaying Dragons™ teaches all of it.",
    close: "If your child has been shrinking from life, Slaying Dragons™ was built for this exact moment.",
  },
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme } = body;
  if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
    return NextResponse.json({ error: "Theme is required (min 3 characters)" }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured. Add GROQ_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }
  const t = theme.trim();

  try {
    const weekDate = new Date().toISOString().split("T")[0];

    const prompt = `Write 8 SHORT marketing video scripts for Guri Dagan (Somali parenting coach). Week of: ${weekDate}.
Theme: "${t}"

RULE: Every script is a completely different video. Same program appears multiple times — each slot still gets a totally different scenario, moment, and technique.

VIDEO SLOTS (use the given scenario for each):
1. YouTube — MePower™ — child said "I give up" after first failure at something they cared about
2. TikTok Mon — MePower™ — child quits mid-activity, won't try again despite gentle encouragement
3. TikTok Tue — Inner Power™ — child becomes unrecognisable around friends, loses all their opinions
4. TikTok Wed — MePower™ — child compares to sibling: "they're just smarter/better than me"
5. TikTok Thu — Inner Power™ — child can't say no to friends, always goes along even feeling wrong
6. TikTok Fri — MindPower™ — child says "I'm stupid" quietly after one mistake, like it's settled
7. TikTok Sat — DreamPower™ — child shrugs when asked what they want to do with their life
8. TikTok Sun — Slaying Dragons™ — child refuses to try anything new, panics at unfamiliar situations

SCRIPT FIELDS — VERY SHORT (every field MAX 1 sentence, except reframe = 2 sentences):
- hookType: fear hook / mistake hook / identity hook / emotional truth hook
- hook: 1 sentence — the parenting moment, make them think "how does she know?"
- problem: 1 sentence — the long-term cost if nothing changes
- reframe: 2 sentences — ONE technique with EXACT words: "Next time your child says X, say: 'Y'."
- teaching: 1 sentence — why one tip isn't enough + name the programme
- close: 1 sentence — bridge to enrollment
- cta: 1 sentence — DM keyword (MEPOWER/INNERPOWER/MINDPOWER/DREAMPOWER/DRAGONS) or free call

Return valid JSON only:
{
  "youtube_title": "...",
  "youtube_script": { "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
  "tiktok_scripts": [
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "title": "...", "hookType": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." }
  ]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a marketing copywriter for a parenting coaching business. Write specific, emotionally precise video scripts. Every script must be completely different from the others. Return valid JSON only. No markdown, no code blocks, no text outside the JSON object." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq ${groqRes.status}: ${errText.slice(0, 200)}`);
    }
    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from Groq");

    const parsed = JSON.parse(content);
    if (
      !parsed.youtube_title ||
      !parsed.youtube_script?.hook ||
      !Array.isArray(parsed.tiktok_scripts) ||
      parsed.tiktok_scripts.length < 5
    ) {
      throw new Error("Invalid AI response shape");
    }
    // Pad to 7 if AI returned fewer
    while (parsed.tiktok_scripts.length < 7) {
      parsed.tiktok_scripts.push({ ...parsed.tiktok_scripts[parsed.tiktok_scripts.length - 1] });
    }
    // Ensure close field exists (backfill from cta if missing)
    if (!parsed.youtube_script.close) parsed.youtube_script.close = parsed.youtube_script.cta;
    parsed.tiktok_scripts.forEach((s: Record<string, string>) => {
      if (!s.close) s.close = s.cta;
    });

    // Attach program and day to each TikTok
    const tiktok_scripts = parsed.tiktok_scripts.map((s: Record<string, string>, i: number) => ({
      ...s,
      program: TIKTOK_PROGRAM_ORDER[i],
      day: DAY_NAMES[i],
    }));

    return NextResponse.json({
      youtube_title: parsed.youtube_title,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: parsed.youtube_script,
      tiktok_scripts,
    });
  } catch (error) {
    console.error("Batch plan error:", error);

    // Fallback: return structured marketing scripts
    return NextResponse.json({
      youtube_title: `Why Your Child Still Struggles With ${t} — And What Really Changes It`,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: {
        hookType: "contrast hook",
        hook: `You've tried everything with your child around ${t.toLowerCase()} — and it's still not working. What if the problem isn't your child at all?`,
        problem: `Most Somali parents are doing everything they were taught — and their children are still losing confidence, shutting down, or acting out. The pain of watching your child struggle and not knowing why is exhausting.`,
        reframe: `The real issue isn't the behavior. It's that your child doesn't yet have the internal belief system to handle life's challenges. That's not a discipline problem — it's a development gap that has a specific solution.`,
        teaching: `In my MePower™ program, we don't patch symptoms. We rebuild the root — your child's self-belief and identity. Parents who've gone through it say the change happens faster than they expected, because we work on the right thing. I've seen children transform in weeks. But there's a process, and it requires the right guidance.`,
        close: `If you're watching this and thinking "that's my child" — this is your sign. MePower™ has limited spots and I only work with parents who are ready to commit.`,
        cta: `Book a free 20-minute call from the link in my bio — let's talk about your child specifically.`,
      },
      tiktok_scripts: TIKTOK_PROGRAM_ORDER.map((program, i) => {
        const fb = PROGRAM_FALLBACKS[program] || PROGRAM_FALLBACKS["MePower™"];
        return {
          day: DAY_NAMES[i],
          program,
          title: `${fb.hook.split(".")[0].replace(/^Your child/, "When your child")}`,
          hookType: "value-tip hook",
          ...fb,
          cta: `DM me "${program.replace("™", "").replace(/ /g, "").toUpperCase()}" and I'll tell you if the programme is right for your child.`,
        };
      }),
      is_fallback: true,
    });
  }
}
