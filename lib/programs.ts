// ─── Guri Dagan — Program Definitions ────────────────────────────────────────
// Every piece of content must belong to one of these 5 programs.
// This is the core business model: content → program → transformation → client.

export const PROGRAMS = {
  "MePower™": {
    name: "MePower™",
    key: "mepower",
    theme: "confidence, self-esteem, identity",
    emotionalGoal: "Help the child believe in themselves",
    childTransformation: "From self-doubt to self-belief",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    dotClass: "bg-violet-500",
  },
  "Inner Power™": {
    name: "Inner Power™",
    key: "innerpower",
    theme: "values, discipline, identity strength",
    emotionalGoal: "Build a child with strong inner character",
    childTransformation: "From external validation to internal values",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  "MindPower™": {
    name: "MindPower™",
    key: "mindpower",
    theme: "mindset, thoughts, positive thinking",
    emotionalGoal: "Shift how the child thinks about challenges",
    childTransformation: "From fixed mindset to growth mindset",
    badgeClass:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
    dotClass: "bg-cyan-500",
  },
  "DreamPower™": {
    name: "DreamPower™",
    key: "dreampower",
    theme: "motivation, imagination, future vision",
    emotionalGoal: "Ignite the child's sense of possibility",
    childTransformation: "From passive to vision-driven",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  "Slaying Dragons™": {
    name: "Slaying Dragons™",
    key: "dragons",
    theme: "fear, resilience, emotional strength",
    emotionalGoal: "Teach the child to face and overcome fear",
    childTransformation: "From fear-avoidance to brave action",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-500",
  },
} as const;

export type ProgramName = keyof typeof PROGRAMS;
export const PROGRAM_NAMES = Object.keys(PROGRAMS) as ProgramName[];

// Default weekly distribution: 7 TikToks + 1 YouTube across programs
export const DEFAULT_DISTRIBUTION: Array<{ program: ProgramName; count: number }> = [
  { program: "MePower™", count: 2 },
  { program: "Inner Power™", count: 2 },
  { program: "MindPower™", count: 1 },
  { program: "DreamPower™", count: 1 },
  { program: "Slaying Dragons™", count: 1 },
];

// ─── Script Parsing ───────────────────────────────────────────────────────────
// angle_notes stored in batch_posts follow this structured format:
//
//   PROGRAM: MePower™
//   HOOK [identity hook]: Are you accidentally destroying your child's confidence?
//   PROBLEM: When parents only see mistakes, children start believing they are the problem.
//   REFRAME: Confidence is built in micro-moments — the way you respond matters most.
//   TEACHING: Praise effort, not outcome. Say "I saw how hard you tried."
//   ACTION: Tonight, find one moment to say "I noticed you..."
//   CTA: Follow for daily parenting tips that build confident children.

export interface ParsedScript {
  program: string | null;
  hookType: string | null;
  hook: string | null;
  problem: string | null;
  reframe: string | null;
  teaching: string | null;
  action: string | null;
  cta: string | null;
  hasScript: boolean;
}

export function parseScriptNotes(notes: string | null | undefined): ParsedScript {
  const empty: ParsedScript = {
    program: null,
    hookType: null,
    hook: null,
    problem: null,
    reframe: null,
    teaching: null,
    action: null,
    cta: null,
    hasScript: false,
  };
  if (!notes) return empty;

  function extract(label: string): string | null {
    const regex = new RegExp(`^${label}:\\s*(.+)$`, "im");
    const match = notes!.match(regex);
    return match ? match[1].trim() : null;
  }

  // HOOK [type]: content — separate hook type from hook content
  const hookLine = notes.match(/^HOOK\s*\[([^\]]+)\]:\s*(.+)$/im);
  const program = extract("PROGRAM");
  const cta = extract("CTA");
  const problem = extract("PROBLEM");
  const reframe = extract("REFRAME");
  const teaching = extract("TEACHING");
  const action = extract("ACTION");

  const hasScript = !!(
    (hookLine || extract("HOOK")) &&
    problem &&
    reframe &&
    teaching &&
    action
  );

  return {
    program,
    hookType: hookLine ? hookLine[1].trim() : null,
    hook: hookLine ? hookLine[2].trim() : extract("HOOK"),
    problem,
    reframe,
    teaching,
    action,
    cta,
    hasScript,
  };
}

export function getProgramBadgeClass(programName: string | null | undefined): string {
  if (!programName) return "bg-muted text-muted-foreground border-border";
  const p = PROGRAMS[programName as ProgramName];
  return p
    ? p.badgeClass
    : "bg-muted text-muted-foreground border-border";
}

export function formatScriptNotes(params: {
  program: string;
  hookType: string;
  hook: string;
  problem: string;
  reframe: string;
  teaching: string;
  action: string;
  cta: string;
  extraNotes?: string;
}): string {
  const lines: string[] = [
    `PROGRAM: ${params.program}`,
  ];
  if (params.extraNotes) {
    lines.push("", params.extraNotes);
  }
  lines.push(
    "",
    `HOOK [${params.hookType}]: ${params.hook}`,
    `PROBLEM: ${params.problem}`,
    `REFRAME: ${params.reframe}`,
    `TEACHING: ${params.teaching}`,
    `ACTION: ${params.action}`,
    `CTA: ${params.cta}`,
  );
  return lines.join("\n");
}
