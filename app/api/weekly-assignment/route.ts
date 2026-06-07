import { NextRequest, NextResponse } from "next/server";
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

// Unique fallback script per VIDEO SLOT (not per program — same program appears multiple times)
const VIDEO_TIPS: Array<{ hook: string; problem: string; reframe: string; teaching: string; close: string }> = [
  // Slot 0 — Tuesday — MePower™ — scenario: child quits after first failure
  {
    hook: "Your child tried something new, couldn't do it on the first attempt, and said 'I can't do this.' You encouraged them. They shut down and walked away.",
    problem: "Every time a child walks away from a hard moment, they write a private story: 'I'm someone who quits.' That story will follow them into every exam, every friendship, every dream they consider and drop.",
    reframe: "Next time your child says 'I can't', don't say 'yes you can.' Instead say: 'What's one tiny step — just one — you could try right now?' That one question moves them from shutdown to motion.",
    teaching: "That question works once. But the quitting pattern has roots — in how they talk to themselves, in what they believe failure means, in whether they trust that effort leads anywhere. MePower™ works through all of it systematically.",
    close: "If this is your child, MePower™ was built to change this pattern from the root — not patch it.",
  },
  // Slot 1 — Wednesday — Inner Power™ — scenario: child becomes a different person around friends
  {
    hook: "At home your child is confident, funny, has opinions. The moment they're with their friends, you barely recognise them. They become whoever the group needs them to be.",
    problem: "A child without a settled sense of self becomes whoever the room demands. That is not flexibility — that is invisibility. Without an identity to return to, they'll follow whoever pulls hardest.",
    reframe: "This Sunday, ask your child: 'What's one decision you made this week that was completely yours — not what your friends chose?' That question, asked weekly, starts building the muscle of self-direction.",
    teaching: "The question plants a seed. But building a real identity — knowing your values, trusting your own read of situations, staying yourself under pressure — takes consistent work. Inner Power™ teaches the five practices that build this.",
    close: "If your child disappears into their social group, Inner Power™ is where they find themselves again.",
  },
  // Slot 2 — Thursday — MePower™ — scenario: child compares themselves to siblings
  {
    hook: "Your child looked at their sibling, then looked at their own work, and said: 'They're just better than me. I'll never be as good.' And they meant it.",
    problem: "Comparison is a thief. A child who uses a sibling as their measuring stick will always feel behind — and eventually stop trying to close the gap. They'll just accept 'less' as their permanent position.",
    reframe: "Next time your child compares themselves, don't argue. Ask: 'What were you able to do this month that you couldn't do last month?' Redirect them to measure against their own past. That's where real confidence lives.",
    teaching: "That redirect helps in the moment. But the deeper issue — why they compare, what they believe about their own ceiling — needs a structured process to shift. That's what MePower™ addresses week by week.",
    close: "If your child has already decided they're the 'less able' one, MePower™ is where that story gets challenged and rewritten.",
  },
  // Slot 3 — Friday — Inner Power™ — scenario: child can't say no to friends
  {
    hook: "Your child came home and told you something they did with their friends. You asked: 'Did you actually want to do that?' They paused. Then said: 'Not really, but everyone else was doing it.'",
    problem: "A child who can't say no is a child who hasn't learned that their discomfort is worth listening to. That leads to following, not leading — and it gets more dangerous as they get older.",
    reframe: "Teach your child this phrase: 'That's not really my thing, but you go ahead.' Practice it at home — say it out loud together until it feels normal. Words rehearsed at home become available under pressure.",
    teaching: "That phrase is a start. But learning to hold your ground — to hear 'come on' and still say no — requires understanding where your values are, what your standards are, and what you're willing to stand for. That's Inner Power™.",
    close: "If your child follows when they should lead, Inner Power™ teaches them to stay themselves regardless of who's watching.",
  },
  // Slot 4 — Saturday — MindPower™ — scenario: child says "I'm stupid" after getting something wrong
  {
    hook: "Your child got something wrong at school. You found out when they came home quiet, sat down, and said — almost to themselves — 'I'm just stupid.' Not upset. Matter-of-fact. Like it was settled.",
    problem: "When a child says 'I'm stupid' calmly, it's not frustration — it's a conclusion. They've decided. And a decided belief is harder to shift than a feeling. Every future challenge confirms it if nothing changes.",
    reframe: "Don't argue with the label. Instead ask: 'What part of this is actually hard for you?' Name the specific thing, not them as a person. 'The fractions are hard' is solvable. 'I'm stupid' isn't.",
    teaching: "Separating the difficulty from the identity is the first move. But a fixed mindset runs deeper — through how they respond to failure, what effort means to them, and what they believe is changeable. MindPower™ addresses each layer.",
    close: "If your child has quietly decided they're 'not smart', MindPower™ is where that decision gets unmade.",
  },
  // Slot 5 — Sunday — DreamPower™ — scenario: child glued to screens with no goals
  {
    hook: "You asked your child: 'What do you want to be when you grow up?' They looked at you, looked back at their screen, and shrugged. Not shy. Just genuinely — nothing. No spark.",
    problem: "A child with no vision doesn't grow toward something — they drift toward whatever is loudest and easiest. Every year without direction, the screen gets longer and the ambition gets quieter.",
    reframe: "Tonight, sit with your child and ask: 'If you could be genuinely great at one thing by this time next year — just one thing — what would you pick?' Write whatever they say. Don't judge it. That's how vision begins.",
    teaching: "That question opens a door. Walking through it — building daily habits, connecting effort to identity, choosing the hard thing over the screen — takes a structured system. That's DreamPower™.",
    close: "If your child is drifting and you're ready to change that, DreamPower™ is where direction and drive get built.",
  },
  // Slot 6 — Sunday — Slaying Dragons™ — scenario: child refuses to try new things
  {
    hook: "There was an opportunity — a new activity, a school event, a chance to try something different. Your child said 'I don't want to go.' You didn't push. It felt like kindness at the time.",
    problem: "Every time avoidance works — every time staying home makes the fear go away — the child's brain learns: fear means stop. The world gets smaller one avoided thing at a time.",
    reframe: "Next time your child says 'I don't want to try', say: 'Let's just do 10 seconds of brave together. Just 10 seconds, then we'll see.' Count out loud with them. That's how courage gets trained — ten seconds at a time.",
    teaching: "Ten seconds works once. Building a child who faces hard things consistently requires mapping their specific fears, taking graded brave steps, collecting evidence of courage, and resetting what they believe they can handle. Slaying Dragons™ teaches all of it.",
    close: "If your child is shrinking from life one avoided thing at a time, Slaying Dragons™ was built for this.",
  },
];

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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add GEMINI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

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

    const t =
      (typeof theme === "string" && theme.trim().length > 2 && theme.trim()) ||
      (typeof topCategory === "string" && topCategory) ||
      "child confidence and parenting";

    const weekDate = new Date().toISOString().split("T")[0]; // changes every week = fresh scripts

    const prompt = `You are writing 8 SHORT marketing video scripts for Guri Dagan (Somali parenting coach). Week of: ${weekDate}.
Theme: "${t}"${recentLine ? `\nAvoid these recent themes: ${(recentThemes as string[]).join(", ")}` : ""}${energyNote ? `\n${energyNote}` : ""}

RULE: Every script must be a completely unique video — different scenario, different parenting moment, different technique. Same program appears multiple times; each slot still gets a totally different script.

VIDEO SLOTS (one script each, use the given scenario):
1. YouTube — MePower™ — child said "I give up" after first failure at something they cared about
2. TikTok Tue — MePower™ — child quits mid-activity, refuses to try again despite gentle encouragement
3. TikTok Wed — Inner Power™ — child becomes unrecognisable around friends, loses their opinions completely
4. TikTok Thu — MePower™ — child compares to sibling: "they're just smarter/better than me"
5. TikTok Fri — Inner Power™ — child can't say no to friends, always goes along even feeling uncomfortable
6. TikTok Sat — MindPower™ — child says "I'm stupid" quietly after one mistake, like it's settled
7. TikTok Sun — DreamPower™ — child shrugs when asked what they want to do with their life
8. TikTok Sun — Slaying Dragons™ — child refuses to try anything new, panics at unfamiliar situations

SCRIPT FIELDS — keep VERY SHORT (TikTok = 60 sec, every field = MAX 1 sentence except reframe):
- title: max 8 words
- hook_type: fear hook / mistake hook / identity hook / emotional truth hook
- hook: 1 sentence — the specific parenting moment, make them think "how does she know?"
- problem: 1 sentence — the long-term cost if nothing changes
- reframe: 2 sentences — ONE technique with EXACT words to say: "Next time your child says X, say: 'Y'."
- teaching: 1 sentence — why one tip isn't enough + name the programme
- close: 1 sentence — bridge to enrollment naming the programme
- cta: 1 sentence — DM keyword (MEPOWER/INNERPOWER/MINDPOWER/DREAMPOWER/DRAGONS) or free call
- notes (YouTube only): 1 sentence recording direction

Return valid JSON only:
{
  "theme": "...",
  "suggested_theme": true,
  "category_used": null,
  "youtube": { "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "notes": "...", "cta": "..." },
  "tiktoks": [
    { "day": "Tuesday", "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Wednesday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Thursday", "program": "MePower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Friday", "program": "Inner Power™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Saturday", "program": "MindPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "DreamPower™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." },
    { "day": "Sunday", "program": "Slaying Dragons™", "title": "...", "hook_type": "...", "hook": "...", "problem": "...", "reframe": "...", "teaching": "...", "close": "...", "cta": "..." }
  ],
  "recording_checklist": ["Water bottle ready", "Ring light on face", "Phone charged", "Notifications silenced", "Record YouTube first", "Short break before TikToks", "Record all 7 TikToks back-to-back", "Mark complete in app"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "You are a marketing copywriter for a parenting coaching business. Write specific, emotionally precise video scripts. Every script must be completely different from the others. Return valid JSON only. No markdown, no code blocks, no text outside the JSON object." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 3000, temperature: 0.9 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${errText.slice(0, 200)}`);
    }
    const geminiData = await geminiRes.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("No content from Gemini");

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
    // Surface the real OpenAI error so we can diagnose
    let errorMsg = error instanceof Error ? error.message : String(error);
    // Detect common OpenAI failures
    if (errorMsg.includes("401") || errorMsg.toLowerCase().includes("auth") || errorMsg.toLowerCase().includes("api key")) {
      errorMsg = "OpenAI API key rejected (401 auth error) — update OPENAI_API_KEY in Vercel";
    } else if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate")) {
      errorMsg = "OpenAI quota exceeded — check billing at platform.openai.com";
    } else if (errorMsg.toLowerCase().includes("abort") || errorMsg.toLowerCase().includes("timeout")) {
      errorMsg = "Request timed out — Vercel 30s Edge limit hit";
    } else if (errorMsg.includes("JSON") || errorMsg.includes("json")) {
      errorMsg = "AI returned invalid JSON — truncated response";
    }
    console.error("Weekly assignment error:", errorMsg);

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
        const tips = VIDEO_TIPS[i] || VIDEO_TIPS[0];
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
      _error: errorMsg,
    });
  }
}
