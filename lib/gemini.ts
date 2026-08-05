// Minimal Gemini REST client — no SDK dependency, just fetch.
// Used for the WhatsApp bot's advice replies (Somali tone is more natural
// from Gemini than from the OpenAI/Groq models already used elsewhere).

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `Waxaad tahay kaaliye AI ah oo ka tirsan Guri Dagan, oo ah barnaamij tababar waalidnimo oo Soomaali ah.
Qof ayaa kuu soo dhiibay dhibaato ama su'aal ku saabsan carruurtiisa. Jawaab si gaaban, si diiran, oo si af-Soomaali caadi ah - ha isticmaalin ereyo waaweyn ama qoraal casri ah. U qor sida qof la sheekaysanayo, ma aha sida buug.
Bixi hal talo oo la taaban karo oo la xiriirta xaaladdooda. Haddii ay ka hadlayaan garaacid ama xanaaq, si naxariis leh ugu talo saar habab kale oo aan garaac lahayn.
Ka dib talada, ku dar hal jumlad oo ah in Guri Dagan ay caawin karto haddii ay rabaan in ay wax badan ka ogaadaan.
Jawaabtu waa in ay ka gaaban tahay 4-5 sadar. Ha weydiin su'aalo - kaliya jawaab oo bixi talo.`;

export async function getAdviceReply(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback =
    "Waan kugu mahadsanahay inaad nala soo xiriirtay. Guri Dagan waxay caawin kartaa waalidiinta iyo carruurta - haddii aad rabto in aad wax badan ka ogaato, taabo hoos.";

  if (!apiKey) return fallback;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || fallback;
  } catch (err) {
    console.error("Gemini advice generation failed:", err);
    return fallback;
  }
}
