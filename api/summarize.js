import { api } from "hatchable";
import { SUMMARY_PROMPT, parseSummary, text } from "lib/finnews.js";

export const access = "public";
export const methods = ["POST"];

export default async function summarize(req, res) {
  const body = req.body;

  // Validate request body
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    ["title", "description", "content"].some(
      key => body[key] != null && typeof body[key] !== "string"
    )
  ) {
    return res.status(422).json({
      detail:
        "Supply an article object with string title, description, and content fields."
    });
  }

  // Prepare article text
  const articleText = [body.title, body.description, body.content]
    .map(text)
    .map(value => value.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 6500);

  if (!articleText) {
    return res.status(400).json({
      detail: "Article has no content to summarize."
    });
  }

  try {
    // GROQ AI
    const result = await api.call("groq", {
      method: "POST",
      path: "/chat/completions",

      body: {
        model: "openai/gpt-oss-120b",
        temperature: 0.2,
        max_tokens: 900,

        messages: [
          {
            role: "system",
            content: SUMMARY_PROMPT
          },
          {
            role: "user",
            content: articleText
          }
        ]
      }
    });

    console.log("GROQ RESULT:", JSON.stringify(result));

    // Check Groq response
    if (
      !result ||
      result.status < 200 ||
      result.status >= 300
    ) {
      console.error(
        "GROQ RESPONSE ERROR:",
        JSON.stringify(result)
      );

      return res.status(502).json({
        status: "error",
        source: "groq",
        upstreamStatus: result?.status ?? null,
        upstreamCode: result?.body?.error?.code ?? null,
        upstreamMessage: result?.body?.error?.message ?? null,
        message: "Groq rejected the summarization request."
      });
    }

    // Get AI response
    const content =
      result.body?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        status: "error",
        source: "groq",
        detail: "Groq returned an empty response."
      });
    }

    // Convert AI response into FinNews summary format
    const summary = parseSummary(content);

    return res.status(200).json(summary);

  } catch (error) {
    console.error("GROQ ERROR:", error);

    return res.status(502).json({
      status: "error",
      source: "groq",
      errorCode: error?.code ?? null,
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? String(error),
      errorDetails: error?.details ?? null
    });
  }
}
