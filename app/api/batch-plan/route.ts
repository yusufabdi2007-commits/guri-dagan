import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const t = theme.trim();

  try {
    const prompt = `You are writing high-converting video scripts for Guri Dagan — a Somali parenting coach. Her content is the front door to her paid programs. Every script must make one specific parent stop scrolling, feel deeply understood, and want to take action TODAY.

Weekly Theme: "${t}"

THE 5 PROGRAMS — KNOW THE EXACT PARENT WATCHING:
1. MePower™ — Her child says "I can't" before even trying. Walks away from challenges. Needs constant praise just to feel okay. Copies others because they don't trust themselves. Parent has tried encouragement — it's not working. Transformation: child builds unshakeable belief in themselves from the inside out. CTA: DM "MEPOWER" or book free call (link in bio).
2. Inner Power™ — Her child does what friends do, changes personality depending on who's around, can't say no to peer pressure. Has no clear identity or values. Parent worries about who they're becoming. Transformation: child knows exactly who they are and holds that line regardless of who's watching. CTA: DM "INNERPOWER" or book free call (link in bio).
3. MindPower™ — Her child says "I'm stupid", "I can't learn this", gives up after one failure, takes mistakes personally. Parent doesn't know how to break the cycle. Transformation: child learns that failure is feedback and that they are capable of growth. CTA: DM "MINDPOWER" or book free call (link in bio).
4. DreamPower™ — Her child has no goals, no motivation, no direction. Drifts through days. Can spend hours on screens but can't focus on what matters. Parent fears they're raising a child with no ambition or purpose. Transformation: child discovers their vision and starts moving toward it with real energy. CTA: DM "DREAMPOWER" or book free call (link in bio).
5. Slaying Dragons™ — Her child avoids anything hard. Gets anxious before school, presentations, anything unfamiliar. Refuses to try new things. Parent watches them shrink from life. Transformation: child learns to face fear and act anyway — and discovers courage is built through action. CTA: DM "DRAGONS" or book free call (link in bio).

FIXED PROGRAM ASSIGNMENT (DO NOT CHANGE):
- YouTube: MePower™
- TikTok Mon: MePower™
- TikTok Tue: Inner Power™
- TikTok Wed: MePower™
- TikTok Thu: Inner Power™
- TikTok Fri: MindPower™
- TikTok Sat: DreamPower™
- TikTok Sun: Slaying Dragons™

THE 8 RULES OF SCRIPTS THAT CONVERT:
1. WRITE FOR ONE PARENT — Not "many parents struggle." Say: "You've corrected your child three times this week. Nothing changed." Specific is magnetic.
2. MAKE THEM FEEL SEEN IN THE FIRST 3 SECONDS — The hook must make them think "how does she know exactly what's happening in my home?"
3. AGITATE THE LONG-TERM COST — Not just "your child struggles" but "and if nothing changes, they'll carry this into adulthood."
4. THE REFRAME IS THE MAGIC MOMENT — One sentence that challenges what they believe. "It's not that your child is lazy — it's that they've never been given a reason to move."
5. NEVER GIVE THE HOW — Give the WHAT and the WHY. The HOW is inside the program. Create the desire, don't fill it.
6. NAME THE PROGRAM AS THE ANSWER — Not "my coaching." Always: "This is exactly what MePower™ is built for."
7. URGENCY WITHOUT PRESSURE — "I only work with parents who are ready to commit" hits harder than "limited spots available."
8. CTA MUST FEEL LIKE RELIEF — Like the parent thinks "finally, I can do something about this." An invitation, not a sales pitch.

TITLE FORMULAS — pick the best structure for each video, make it specific to the theme AND the assigned program's audience:
- "Your child isn't [label parents use] — they [real diagnosis that creates desire for the program]"
- "What I tell every parent whose child [specific painful behavior every parent recognizes]"
- "The [surprising thing] that secretly [destroys/blocks a specific quality] in your child"
- "If your child does [specific behavior], watch this before you do anything else"
- "Why [common parenting approach] is actually making your child's [specific struggle] worse"
- "Stop [well-meaning thing parents do] — here's what actually works for [specific outcome]"

HOOK FORMULAS — the hook is everything, must stop a tired parent scrolling at 11pm:
- Scenario: "Your child just said 'I give up.' You told them to try again. They walked away. That's not a motivation problem — it's something deeper."
- Bold truth: "Telling your child they're smart is not building their confidence. In fact, it might be doing the opposite."
- Question: "When's the last time your child tried something hard and didn't give up? If you're struggling to remember — keep watching."
- Challenge: "If your child gives up every time things get difficult, there is ONE thing missing. And it's not more encouragement."
- Confession: "I used to think confident children were born that way. Then I worked with hundreds of Somali families and found out the truth."

SCRIPT STRUCTURE — "language teacher" model: give ONE real technique, then sell the complete system:
1. hook: One specific scenario so vivid the parent thinks "that's literally my house." 2 punchy sentences. No generics.
2. problem: Name the exact pain + the long-term cost if nothing changes. 2 sentences. Let them feel it.
3. reframe: Give ONE real, specific, immediately usable technique — exact words to say, exact question to ask, exact action to take. Format: "Next time [X happens], instead of [what most parents do], try: '[exact words/action]'. Here's why this works: [one sentence]." This is real value that builds trust and makes them want more.
4. teaching: Show why ONE tip is not the complete solution. Name 2 other layers without explaining them. "That works for one moment — but there are [N] other things: [name them briefly]. All of that is inside [Program Name] — parents who go through it tell me [specific transformation result]."
5. close: "If you used that and want the complete system for your child, [Program Name] is where we build all of it." 1 sentence.
6. cta: One clear action. DM keyword or free call. 1 sentence.

QUALITY CHECK — every script must pass all 5:
✓ Does the hook describe ONE specific scenario the parent has actually lived?
✓ Is the REFRAME a real, usable technique with exact words — not just a concept?
✓ Does the TEACHING show the gap without filling it?
✓ Is the program named as THE complete solution?
✓ Does the CTA feel like the obvious, risk-free next step?

Return valid JSON only — no markdown, no explanation outside the JSON:
{
  "youtube_title": "...",
  "youtube_script": {
    "hookType": "...",
    "hook": "...",
    "problem": "...",
    "reframe": "...",
    "teaching": "...",
    "close": "...",
    "cta": "..."
  },
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
    const timeoutId = setTimeout(() => controller.abort(), 52_000);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a world-class direct-response copywriter specialising in coaching businesses. You write video scripts that make parents feel deeply understood, create genuine desire for the transformation, and move them to act. You are specific, personal, and emotionally precise. Return valid JSON only. No markdown fences. No text outside the JSON object." },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 6000,
      response_format: { type: "json_object" },
    }, { signal: controller.signal });
    clearTimeout(timeoutId);

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

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
