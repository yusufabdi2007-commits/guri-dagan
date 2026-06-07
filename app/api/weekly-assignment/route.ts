import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = 'edge';
export const maxDuration = 60;

// Recording is Monday. Posting: YouTube on Sunday, TikToks Tue–Sat + 2 on Sunday.
const DAYS = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Sunday"];

// Default program distribution for 7 TikToks
// YouTube is assigned separately (usually the highest-engagement program)
const PROGRAM_SLOTS = [
  "MePower™",         // Tuesday
  "Inner Power™",     // Wednesday
  "MePower™",         // Thursday
  "Inner Power™",     // Friday
  "MindPower™",       // Saturday
  "DreamPower™",      // Sunday
  "Slaying Dragons™", // Sunday
];

const FALLBACK_TIKTOKS = [
  { title: "Signs your child is losing confidence", program: "MePower™" },
  { title: "The discipline mistake that destroys trust", program: "Inner Power™" },
  { title: "What to say after your child fails", program: "MePower™" },
  { title: "One value every child needs before age 10", program: "Inner Power™" },
  { title: "Why your child gives up too easily", program: "MindPower™" },
  { title: "How to help your child believe in their future", program: "DreamPower™" },
  { title: "What brave parenting actually looks like", program: "Slaying Dragons™" },
];

const HOOK_TYPES = ["fear hook", "mistake hook", "identity hook", "emotional truth hook"];

const PROGRAM_TIPS: Record<string, { hook: string; problem: string; reframe: string; teaching: string; close: string }> = {
  "MePower™": {
    hook: "Your child tried something new, couldn't get it on the first attempt, and said 'I can't do this.' You told them to keep going. They shut down.",
    problem: "Every time a child walks away from a challenge, they build a story: 'I'm someone who gives up.' If that story goes unchallenged, they carry it into every job, every test, every relationship.",
    reframe: "Next time your child says 'I can't', don't say 'yes you can.' Say: 'What's one tiny step you could try?' That question shifts their brain from shutdown to movement. Try it today.",
    teaching: "That tip works for one moment. But there are four deeper layers — identity, self-talk, challenge tolerance, and internal belief — that all need to shift for this to become permanent. That's what MePower™ is built to work through together.",
    close: "If you used that and want the complete system for your child, MePower™ is where we build all of it.",
  },
  "Inner Power™": {
    hook: "Your child is completely different around their friends. At home — one person. With their group — someone you barely recognise.",
    problem: "A child who becomes whoever the room needs them to be hasn't found themselves yet. Without a clear identity, they'll follow whoever pulls hardest — and that is dangerous.",
    reframe: "Ask your child this Sunday: 'What's one decision you made this week that was yours — not your friends'?' That single question starts building the muscle of self-direction.",
    teaching: "That question plants a seed. But building a true identity — values, standards, who they are when no one's watching — takes five specific practices done consistently. Inner Power™ teaches all five.",
    close: "If you want your child to hold their ground regardless of who they're with, Inner Power™ was made for this.",
  },
  "MindPower™": {
    hook: "Your child got something wrong and said 'I'm stupid.' You said 'no you're not.' They smiled. Then said it again the following week.",
    problem: "When we immediately contradict a child's self-label, they don't learn they're capable — they learn they need rescuing from the feeling. The root belief never shifts.",
    reframe: "Next time your child says 'I'm stupid', don't argue. Ask: 'What does this tell you about what to try differently?' That reframes failure as information instead of identity.",
    teaching: "That reframe helps in the moment. But a fixed mindset has four layers underneath: self-talk, failure response, effort belief, and ceiling story. MindPower™ works through all four — parents say their child's relationship with difficulty completely changed.",
    close: "If your child has decided something untrue about themselves, MindPower™ is where that story gets rewritten.",
  },
  "DreamPower™": {
    hook: "Ask your child what they want to do with their life. Watch their face. Do they light up — or do they shrug and look away?",
    problem: "A child with no vision drifts toward whatever is loudest — screens, the wrong crowd, the easiest path. Every year without direction, the drift goes deeper.",
    reframe: "Tonight, give your child 10 minutes. Ask: 'If you could be great at one thing by next year, what would it be?' Write the answer down together. Don't judge it. That's how vision begins.",
    teaching: "That exercise plants a seed. Growing it into real motivation — habits, daily rituals, a reason to choose effort over the screen — takes a complete system. That's DreamPower™.",
    close: "If your child is drifting and you're ready to change that, DreamPower™ is where direction gets built.",
  },
  "Slaying Dragons™": {
    hook: "There was a school event, a new situation, a chance to try something different. Your child said 'I don't want to go.' You let them stay. It felt like kindness.",
    problem: "Every time a child avoids a fear and the avoidance works, they learn: fear means stop. The world gets smaller. What they're willing to try gets fewer.",
    reframe: "Next time your child says 'I don't want to try', say: 'Let's do 10 seconds of brave. Just 10 seconds.' Count with them. That's how courage gets built — ten seconds at a time.",
    teaching: "Ten seconds works once. But building a child who consistently faces hard things requires a full framework: fear mapping, brave action steps, courage evidence, and belief reset. Slaying Dragons™ teaches all of it.",
    close: "If your child has been shrinking from life, Slaying Dragons™ was built for this exact moment.",
  },
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme, lowEnergy, topCategory, growingCategory, underusedCategory, recentThemes } = body;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const categoryLines = [
      topCategory && `Best performing category: ${topCategory}`,
      growingCategory && growingCategory !== topCategory && `Fastest growing: ${growingCategory}`,
      underusedCategory && `Underused opportunity: ${underusedCategory}`,
    ]
      .filter(Boolean)
      .join("\n");

    const recentLine =
      Array.isArray(recentThemes) && recentThemes.length > 0
        ? `Recent themes (avoid repeating): ${(recentThemes as string[]).join(", ")}`
        : "";

    const energyNote = lowEnergy
      ? "LOW ENERGY WEEK: Choose warm, story-based, relatable topics. Keep scripts simple and personal."
      : "";

    const themeInstruction =
      typeof theme === "string" && theme.trim().length > 2
        ? `Use this theme provided by the creator: "${theme.trim()}"`
        : `Suggest the best theme based on the performance data and programs below.`;

    const prompt = `You are writing high-converting video scripts for Guri Dagan — a Somali parenting coach whose content is the front door to her 5 paid programs. Every script must make ONE specific parent stop scrolling, feel deeply understood, and want to enroll TODAY.

Performance Intelligence:
${categoryLines || "No category data — use best judgement for a Somali parenting audience."}
${recentLine}
${energyNote}

Task: ${themeInstruction}

THE 5 PROGRAMS — KNOW THE EXACT PARENT EACH ONE SERVES:
• MePower™ — Her child says "I can't" before trying, walks away from challenges, needs constant praise just to feel okay, copies others because they don't trust themselves. Parent has tried encouragement — nothing sticks. Transformation: child builds unshakeable belief in themselves from the inside. CTA: DM "MEPOWER" or book free call (link in bio).
• Inner Power™ — Her child does what friends do, changes personality around different people, can't say no to peer pressure, has no clear sense of who they are. Parent worries about who they're becoming. Transformation: child knows exactly who they are and holds that line regardless of who's watching. CTA: DM "INNERPOWER" or book free call (link in bio).
• MindPower™ — Her child says "I'm stupid", gives up after one failure, takes mistakes personally, sees a ceiling on what they can become. Parent doesn't know how to break this cycle. Transformation: child learns failure is feedback and that they are genuinely capable of growth. CTA: DM "MINDPOWER" or book free call (link in bio).
• DreamPower™ — Her child has no goals, no motivation, no direction. Drifts through days. Hours on screens, can't focus on what matters. Parent fears they're raising someone with no purpose or ambition. Transformation: child discovers a vision and starts moving toward it with real energy. CTA: DM "DREAMPOWER" or book free call (link in bio).
• Slaying Dragons™ — Her child avoids anything hard, gets anxious before school or new situations, refuses to try things they might fail. Parent watches them shrink from life. Transformation: child learns that courage is built by acting despite fear — and starts doing it. CTA: DM "DRAGONS" or book free call (link in bio).

PROGRAM DISTRIBUTION:
- YouTube (long-form, Sunday): assign to the program most aligned with the theme
- TikTok distribution: MePower™ × 2, Inner Power™ × 2, MindPower™ × 1, DreamPower™ × 1, Slaying Dragons™ × 1
- Posting days for TikToks: Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Sunday

THE 8 RULES OF SCRIPTS THAT CONVERT:
1. WRITE FOR ONE PARENT — Not "many parents struggle." Say: "You've corrected your child three times this week. Nothing changed." Specific is magnetic.
2. MAKE THEM FEEL SEEN IN THE FIRST 3 SECONDS — The hook must make them think "how does she know exactly what's happening in my home?"
3. AGITATE THE LONG-TERM COST — Not just "your child struggles" but "and if nothing changes, they'll carry this into adulthood."
4. THE REFRAME IS THE MAGIC MOMENT — One sentence that challenges what they believe. "It's not that your child is lazy — it's that they've never been given a reason to move."
5. NEVER GIVE THE HOW — Give the WHAT and the WHY. The HOW is inside the program. Create the desire, don't fill it.
6. NAME THE PROGRAM AS THE ANSWER — Not "my coaching." Always: "This is exactly what MePower™ is built for."
7. URGENCY WITHOUT PRESSURE — "I only work with parents who are ready to commit" hits harder than "limited spots available."
8. CTA MUST FEEL LIKE RELIEF — Like the parent thinks "finally, I can do something about this." An invitation, not a sales pitch.

TITLE FORMULAS — use one of these proven structures for every video, make it specific to the theme AND the assigned program's parent:
- "Your child isn't [label parents use] — they [real diagnosis that opens desire for the program]"
- "What I tell every parent whose child [specific painful behavior every parent recognises]"
- "The [surprising thing] that secretly [destroys/blocks a specific quality] in your child"
- "If your child does [specific behavior], watch this before you do anything else"
- "Why [common parenting approach] is actually making your child's [specific struggle] worse"
- "Stop [well-meaning thing parents do] — here's what actually works for [specific outcome]"

HOOK FORMULAS — the hook must stop a tired parent scrolling at 11pm:
- Scenario: "Your child just said 'I give up.' You told them to try again. They walked away. That's not a motivation problem — it's something deeper."
- Bold truth: "Telling your child they're smart is not building their confidence. It might be doing the opposite."
- Question: "When's the last time your child tried something hard and didn't give up? If you're struggling to remember — keep watching."
- Challenge: "If your child gives up every time things get difficult, there is ONE thing missing. And it's not more encouragement."
- Confession: "I used to think confident children were born that way. Then I worked with hundreds of Somali families and found out the truth."

SCRIPT STRUCTURE — "language teacher" model: give ONE real technique, then sell the complete system:
1. HOOK (0–3s): One specific scenario so vivid the parent thinks "that's literally happening in my house." 2 punchy sentences. No generics allowed.
2. PROBLEM (3–12s): Name the exact pain + the long-term cost if nothing changes. 2 sentences. Let them feel it before you rescue them.
3. REFRAME (12–35s): Give ONE real, specific, immediately usable technique — exact words to say, exact question to ask, exact action to take. Use this format: "Next time [X happens], instead of [what most parents do], try: '[exact words/action]'. Here's why this works: [one sentence]." This is the "one word" — real value that builds trust and makes them want MORE.
4. TEACHING (35–52s): Show why ONE tip is not the complete solution. Name 2–3 other layers without explaining them. "That works for one moment — but there are [N] other things your child needs: [name them briefly, don't explain]. All of that is inside [Program Name] — and parents who complete it tell me [specific transformation result]."
5. CLOSE (52–57s): "If you used that tip and want the complete system for your child specifically, [Program Name] is where we build all of it together." 1 sentence.
6. CTA (57–60s): One clear, risk-free action. DM keyword or book a free call.

YouTube specifics: deeper authority-build, 5–10 min. Teach 2–3 specific techniques (each with exact words/actions). Then show why the complete framework is only inside the program. Ends with strong consultation booking push. Give the notes field 2–3 recording direction sentences.

QUALITY CHECK — every script must pass all 5:
✓ Does the hook describe ONE specific scenario the parent has literally lived through?
✓ Is the REFRAME a real, usable technique with exact words — not just a concept or insight?
✓ Does the TEACHING name the gap without filling it?
✓ Is the program named as THE complete solution, not an afterthought?
✓ Does the CTA feel like the obvious, risk-free next step?

Return valid JSON only:
{
  "theme": "...",
  "suggested_theme": true or false,
  "category_used": "... or null",
  "youtube": {
    "program": "MePower™",
    "title": "...",
    "hook_type": "identity hook",
    "hook": "...",
    "problem": "...",
    "reframe": "...",
    "teaching": "...",
    "close": "...",
    "notes": "2-3 sentences of content direction for recording",
    "cta": "..."
  },
  "tiktoks": [
    {
      "day": "Tuesday",
      "program": "MePower™",
      "title": "...",
      "hook_type": "fear hook",
      "hook": "...",
      "problem": "...",
      "reframe": "...",
      "teaching": "...",
      "close": "...",
      "cta": "..."
    },
    { "day": "Wednesday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Thursday", "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Friday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Saturday", "program": "MindPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "DreamPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "Slaying Dragons™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." }
  ],
  "recording_checklist": ["...", "...", "...", "...", "...", "...", "...", "..."]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 52_000);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a world-class direct-response copywriter specialising in coaching businesses. You write video scripts that make parents feel deeply understood, create genuine desire for the transformation, and move them to act. You are specific, personal, and emotionally precise. Every video belongs to one of the 5 programs and follows the 6-part structure exactly. Return valid JSON only. No markdown. No text outside the JSON object." },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      signal: controller.signal as AbortSignal,
    });
    clearTimeout(timeoutId);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);
    if (
      !parsed.theme ||
      !parsed.youtube ||
      !Array.isArray(parsed.tiktoks) ||
      parsed.tiktoks.length < 5
    ) {
      throw new Error("Invalid AI response shape");
    }
    // Pad to 7 if AI returned fewer
    while (parsed.tiktoks.length < 7) {
      const i = parsed.tiktoks.length;
      parsed.tiktoks.push({ ...parsed.tiktoks[parsed.tiktoks.length - 1], day: DAYS[i] ?? DAYS[6], program: PROGRAM_SLOTS[i] ?? PROGRAM_SLOTS[6] });
    }

    return NextResponse.json({ ...parsed, is_fallback: false });
  } catch (error) {
    console.error("Weekly assignment error:", error);

    const t =
      (typeof theme === "string" && theme.trim()) ||
      (typeof topCategory === "string" && topCategory) ||
      "parenting";
    const themeLabel = t.charAt(0).toUpperCase() + t.slice(1);

    return NextResponse.json({
      theme: `${themeLabel} Transformation`,
      suggested_theme: !theme,
      category_used: typeof topCategory === "string" ? topCategory : null,
      youtube: {
        program: "MePower™",
        title: "How to Raise Confident Children: A Complete Guide for Somali Parents",
        hook_type: "identity hook",
        hook: "Are you accidentally raising a child who doesn't believe in themselves?",
        problem: "Most parents focus on mistakes without realising this slowly teaches children they are the problem — not their behaviour.",
        reframe: "Confidence is not something children are born with. It is built in tiny daily moments by what you say and how you respond.",
        teaching: "In MePower™, we don't fix behavior — we rebuild the root: your child's self-belief. Parents who've done this program say the shift happened faster than they expected. But it requires the right framework, not just good intentions.",
        close: "If you watched this and thought 'that's my child' — this is your sign. MePower™ has limited spots and I only work with parents who are ready.",
        notes: "Build authority on why daily praise patterns silently shape identity. Show the gap between what parents intend and what children absorb. End with a strong enrollment push.",
        cta: "Book a free 20-minute call from the link in my bio — let's talk about your child specifically.",
      },
      tiktoks: DAYS.map((day, i) => {
        const prog = PROGRAM_SLOTS[i];
        const tips = PROGRAM_TIPS[prog] || PROGRAM_TIPS["MePower™"];
        return {
          day,
          program: prog,
          title: FALLBACK_TIKTOKS[i].title,
          hook_type: HOOK_TYPES[i % HOOK_TYPES.length],
          ...tips,
          cta: `DM me "${prog.replace("™", "").replace(/ /g, "").toUpperCase()}" and I'll tell you if the programme is right for your child.`,
        };
      }),
      recording_checklist: [
        "Water bottle nearby",
        "Good natural light or ring light on your face",
        "Phone fully charged or plugged in",
        "Room is quiet — notifications silenced",
        "YouTube notes visible (printed or on screen)",
        "Record YouTube first while energy is highest",
        "Take a short break before recording TikToks",
        "Record all 7 TikToks back-to-back for flow",
      ],
      is_fallback: true,
    });
  }
}
