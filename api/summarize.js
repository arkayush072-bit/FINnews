import Groq from "groq-sdk";

const groq = new Groq();

export async function summarize(article) {
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL, // set in config; check Groq's models page
      messages: [
        { role: "system", content: "Summarize this financial news article in three sentences." },
        { role: "user", content: article },
      ],
    });
    return { ok: true, summary: completion.choices[0]?.message?.content ?? "" };
  } catch (err) {
    if (err.status === 401) {
      console.error("Groq returned 401 (invalid_api_key). Check the key, then Groq's status page.");
      return { ok: false, status: 503, error: "Summaries are temporarily unavailable." };
    }
    if (err.status === 429) {
      return { ok: false, status: 429, error: "Too many requests. Try again shortly." };
    }
    console.error("Groq request failed:", err.status, err.message);
    return { ok: false, status: 502, error: "Summary service error." };
  }
}
