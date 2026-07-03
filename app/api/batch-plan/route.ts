import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = 'edge';
export const maxDuration = 60;

// Fixed weekly program distribution — NEVER changes
// YouTube: MePower™ — posts Wednesday (flagship, highest lead-conversion)
// 7 TikToks: Mon→MePower, Tue→Inner Power, Wed→MePower, Thu→Inner Power,
//             Fri→MindPower, Sat→DreamPower, Sun→Slaying Dragons
const TIKTOK_PROGRAM_ORDER = [
  "MePower™",         // Mon
  "Inner Power™",     // Tue
  "MePower™",         // Wed
  "Inner Power™",     // Thu
  "MindPower™",       // Fri
  "DreamPower™",      // Sat
  "Slaying Dragons™", // Sun
] as const;

const YOUTUBE_PROGRAM = "MePower™";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Pool of scenario variants per slot — one is picked randomly each generation
// so scripts never feel repetitive even with the same program distribution
const SCENARIO_POOLS: Record<string, string[]> = {
  youtube_mepower: [
    "child said 'I give up' after their very first failure at something they cared about",
    "child refused to go back to an activity after one embarrassing moment in front of others",
    "child says 'I'm just bad at this' and believes it — not fishing for praise, genuinely convinced",
    "child gave up on a hobby they loved the moment it got harder",
    "child cried after a test result and said 'I'm never trying again'",
  ],
  mon_mepower: [
    "child quits mid-activity, won't try again despite gentle encouragement from parent",
    "child scrunches up their work and throws it away in frustration instead of fixing the mistake",
    "child walks out of a challenge saying 'this is stupid' — really meaning 'I'm scared I'll fail'",
    "child refuses to do any task they've previously struggled with, even an easy version",
    "child shuts down completely after a small correction and won't engage for the rest of the day",
  ],
  tue_innerpower: [
    "child becomes a completely different person around their friends — unrecognisable at home vs. outside",
    "child changed their opinion mid-sentence the moment a friend disagreed with them",
    "child started dressing, talking, and acting like one specific friend — losing all their own personality",
    "child came home from school clearly copying another child's phrases, interests, and jokes",
    "child agreed to something they clearly hated just to avoid standing out from the group",
  ],
  wed_mepower: [
    "child compares themselves to a sibling: 'they're just smarter than me'",
    "child watched a sibling succeed at something and went silent — then refused to try the same thing",
    "child said 'everyone is better than me' after a normal group activity",
    "child celebrated another child's achievement out loud, then whispered 'I could never do that'",
    "child stopped trying at school the week a sibling got praised for their results",
  ],
  thu_innerpower: [
    "child can't say no to friends even when they can feel it's the wrong choice",
    "child agreed to leave out another friend from a group because the leader said so",
    "child came home clearly uncomfortable about something they did with friends — but defended it anyway",
    "child joined in mocking something they privately love, just to fit in with the group",
    "child lied to a parent about where they were going because 'everyone else was going'",
  ],
  fri_mindpower: [
    "child said 'I'm stupid' quietly after one mistake — not as a complaint, but like it's a settled fact",
    "child failed one question on a test and said 'I knew it — I'm just dumb'",
    "child said 'my brain doesn't work like other people's' with complete calm, as if describing their eye colour",
    "child stopped raising their hand in class because 'what's the point, I always get it wrong'",
    "child whispered 'I'm the worst in the class' to themselves while doing homework",
  ],
  sat_dreampower: [
    "child shrugs and says 'I don't know' when asked what they want to do with their life",
    "child laughed nervously when asked about their dreams — like it was a silly question",
    "child said 'it doesn't matter what I want' when planning for the future came up",
    "child gave a completely blank answer when asked what excites them — like the question itself confused them",
    "child listed only things other people want for them when asked about their goals",
  ],
  sun_dragons: [
    "child refuses to try anything new — every unfamiliar situation triggers a quiet panic",
    "child pretended to be sick on the morning of something new to avoid having to go",
    "child cried at the door of a new activity and refused to go in even with a parent beside them",
    "child spent a whole weekend dreading one small unfamiliar thing next week",
    "child said 'what if I'm the only one who doesn't know how' — and that was enough to make them quit before starting",
  ],
};

function pickOne(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

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

/**
 * Extracts the most theme-relevant sections from curriculum text.
 * Splits into paragraphs, scores each by keyword overlap with the theme,
 * then returns up to maxChars of the highest-scoring content.
 */
function extractRelevantSections(text: string, theme: string, maxChars: number): string {
  const themeWords = theme.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 40);

  // Score: count theme keyword occurrences in each paragraph
  const scored = paragraphs.map(p => {
    const lower = p.toLowerCase();
    const score = themeWords.reduce((acc, w) => acc + (lower.split(w).length - 1), 0);
    return { text: p, score };
  });

  // Always keep the first 2 paragraphs (context/intro), rank the rest by relevance
  const intro = scored.slice(0, 2);
  const ranked = scored.slice(2).sort((a, b) => b.score - a.score);
  const ordered = [...intro, ...ranked];

  let result = "";
  for (const { text } of ordered) {
    if (result.length + text.length + 2 > maxChars) break;
    result += text + "\n\n";
  }
  return result.trim();
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.ok) return NextResponse.json({ error: limit.error }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme, userId } = body;
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

    // Fetch curriculum knowledge for all programs (public read, no auth required)
    let curriculumContext = "";
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const userFilter = typeof userId === "string" && userId.length > 0
          ? `&user_id=eq.${encodeURIComponent(userId)}`
          : "";
        const kbRes = await fetch(
          `${supabaseUrl}/rest/v1/program_knowledge?select=program_name,extracted_text&limit=10${userFilter}`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (kbRes.ok) {
          const knowledge = (await kbRes.json()) as { program_name: string; extracted_text: string }[];
          if (knowledge.length > 0) {
            curriculumContext =
              "\n\nCURRICULUM KNOWLEDGE — The uploaded curriculum is the authoritative source for what is taught. Every script MUST teach a real concept, framework, exercise, tool, or principle that exists in the programme materials. Do not invent new programme techniques or attribute ideas to the programme that are not present in the curriculum. You MAY create original hooks, stories, family scenarios, analogies, examples, transitions, and calls to action — these creative elements exist only to explain or demonstrate the real curriculum, never to replace it. If the requested topic is only partially covered by the curriculum, stay faithful to the programme's philosophy and clearly ground the lesson in the closest relevant material rather than inventing a new framework.\n";
            for (const k of knowledge) {
              // Extract the most relevant sections for this week's theme (max 2500 chars per program)
              const snippet = extractRelevantSections(k.extracted_text, t, 2500);
              if (snippet) curriculumContext += `\n[${k.program_name}]\n${snippet}\n`;
            }
          }
        }
      }
    } catch {
      // Silently skip — scripts still generate with built-in fallback knowledge
    }

    // Pick a random scenario variant for each slot — ensures different scripts every generation
    const scenarios = {
      yt:  pickOne(SCENARIO_POOLS.youtube_mepower),
      mon: pickOne(SCENARIO_POOLS.mon_mepower),
      tue: pickOne(SCENARIO_POOLS.tue_innerpower),
      wed: pickOne(SCENARIO_POOLS.wed_mepower),
      thu: pickOne(SCENARIO_POOLS.thu_innerpower),
      fri: pickOne(SCENARIO_POOLS.fri_mindpower),
      sat: pickOne(SCENARIO_POOLS.sat_dreampower),
      sun: pickOne(SCENARIO_POOLS.sun_dragons),
    };

    const prompt = `Write 8 SHORT marketing video scripts for Guri Dagan (Somali parenting coach). Week of: ${weekDate}.${curriculumContext}
Theme: "${t}"

RULE: Every script is a completely different video. Same program appears multiple times — each slot still gets a totally different scenario, moment, and technique. Write fresh, specific content for each slot.

VIDEO SLOTS (use the exact scenario given for each — do not swap or reuse):
1. YouTube Wed — MePower™ — ${scenarios.yt}
2. TikTok Mon — MePower™ — ${scenarios.mon}
3. TikTok Tue — Inner Power™ — ${scenarios.tue}
4. TikTok Wed — MePower™ — ${scenarios.wed}
5. TikTok Thu — Inner Power™ — ${scenarios.thu}
6. TikTok Fri — MindPower™ — ${scenarios.fri}
7. TikTok Sat — DreamPower™ — ${scenarios.sat}
8. TikTok Sun — Slaying Dragons™ — ${scenarios.sun}

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

    const AI_SYSTEM = "You are a marketing copywriter for a parenting coaching business. Write specific, emotionally precise video scripts. Every script must be completely different from the others — different scenario, different moment, different technique. The uploaded curriculum is the authoritative source for what is taught — every script must teach a real concept, framework, exercise, tool, or principle that exists in the programme materials. Do not invent new programme techniques or attribute ideas to the programme that are not present in the curriculum. You may create original hooks, stories, family scenarios, analogies, examples, transitions, and calls to action — these creative elements exist only to explain or demonstrate the real curriculum, never to replace it. Return valid JSON only. No markdown, no code blocks, no text outside the JSON object.";

    // Attempt 1: Groq (fast, free)
    async function callGroq(): Promise<string> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28_000);
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: AI_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 2800,
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
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // Attempt 2: OpenAI GPT-4o-mini (reliable paid fallback)
    async function callOpenAI(): Promise<string> {
      if (!process.env.OPENAI_API_KEY) throw new Error("No OPENAI_API_KEY");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);
      try {
        const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: AI_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 2800,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!oaiRes.ok) {
          const errText = await oaiRes.text();
          throw new Error(`OpenAI ${oaiRes.status}: ${errText.slice(0, 200)}`);
        }
        const oaiData = await oaiRes.json();
        const content = oaiData.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content from OpenAI");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // Attempt 1b: Groq fast model (20,000 TPM — much higher limits)
    async function callGroqFast(): Promise<string> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28_000);
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: AI_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 2800,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!groqRes.ok) {
          const errText = await groqRes.text();
          throw new Error(`GroqFast ${groqRes.status}: ${errText.slice(0, 200)}`);
        }
        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content from GroqFast");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    let rawContent: string;
    try {
      rawContent = await callGroq();
    } catch (groqErr) {
      console.warn("Groq 70B failed, trying Groq 8B:", groqErr instanceof Error ? groqErr.message : groqErr);
      try {
        rawContent = await callGroqFast();
      } catch (groqFastErr) {
        console.warn("Groq 8B failed, trying OpenAI:", groqFastErr instanceof Error ? groqFastErr.message : groqFastErr);
        rawContent = await callOpenAI(); // throws to outer catch → static fallback
      }
    }

    const parsed = JSON.parse(rawContent);
    if (
      !parsed.youtube_title ||
      !parsed.youtube_script?.hook ||
      !Array.isArray(parsed.tiktok_scripts) ||
      parsed.tiktok_scripts.length < 5
    ) {
      throw new Error("Invalid AI response shape");
    }
    // Pad to 7 if AI returned fewer — use fallback for missing slots, not duplicates
    const slotKeys = ["mon","tue","wed","thu","fri","sat","sun"] as const;
    while (parsed.tiktok_scripts.length < 7) {
      const i = parsed.tiktok_scripts.length;
      const prog = TIKTOK_PROGRAM_ORDER[i];
      const fb = PROGRAM_FALLBACKS[prog] || PROGRAM_FALLBACKS["MePower™"];
      parsed.tiktok_scripts.push({
        title: `${prog} — ${t}`,
        hookType: "value-tip hook",
        hook: fb.hook,
        problem: fb.problem,
        reframe: fb.reframe,
        teaching: fb.teaching,
        close: fb.close,
        cta: fb.cta,
      });
      void slotKeys;
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Batch plan error:", errorMsg);

    // Fallback: return theme-aware scripts (NOT static — every field references the actual theme)
    const tLower = t.toLowerCase();
    const tCapital = t.charAt(0).toUpperCase() + t.slice(1);
    return NextResponse.json({
      youtube_title: `The Real Reason "${tCapital}" Is So Hard For Your Child — And What Actually Changes It`,
      youtube_program: YOUTUBE_PROGRAM,
      youtube_script: {
        hookType: "contrast hook",
        hook: `Your child is struggling with ${tLower} — and you've tried everything. What if the problem isn't effort, but a missing belief?`,
        problem: `Without the right foundation, children hit the same wall with ${tLower} again and again — and each time they do, they quietly decide this is just who they are.`,
        reframe: `Next time your child shuts down around ${tLower}, don't push harder. Say: "What's one tiny thing we could try right now?" That shifts them from stuck to moving. Try it today.`,
        teaching: `That one move helps in the moment. But building the confidence to handle ${tLower} consistently requires five deeper shifts — and that's exactly what MePower™ is designed to work through with your child.`,
        close: `If ${tLower} is something your family is facing right now, MePower™ was built for this.`,
        cta: `Book a free 20-minute call from the link in my bio — let's talk about your child and ${tLower} specifically.`,
      },
      tiktok_scripts: TIKTOK_PROGRAM_ORDER.map((program, i) => {
        const fb = PROGRAM_FALLBACKS[program] || PROGRAM_FALLBACKS["MePower™"];
        const themeHook = fb.hook.replace(
          /something|challenges|hard things|life/gi,
          tLower
        );
        const themeReframe = fb.reframe.replace(
          /something|challenge|hard thing/gi,
          tLower
        );
        return {
          day: DAY_NAMES[i],
          program,
          title: `When Your Child Struggles With ${tCapital} — ${program}`,
          hookType: "value-tip hook",
          hook: themeHook,
          problem: fb.problem,
          reframe: themeReframe,
          teaching: fb.teaching,
          close: fb.close,
          cta: `DM me "${program.replace("™", "").replace(/ /g, "").toUpperCase()}" and I'll tell you if the programme is right for your child's ${tLower} journey.`,
        };
      }),
      is_fallback: true,
      fallback_reason: errorMsg,
    });
  }
}
