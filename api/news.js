import { api } from "hatchable";
import { DEMO_ARTICLES, normalizeArticles } from "lib/finnews.js";

export const access = "public";
export const methods = ["GET"];

export default async function news(req, res) {
  const query = req.query?.q ?? "finance";
  const rawSize = req.query?.page_size ?? "12";
  const pageSize = Number(rawSize);

  // Validate input
  if (
    typeof query !== "string" ||
    !query.trim() ||
    query.length > 200 ||
    !["string", "number"].includes(typeof rawSize) ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50
  ) {
    return res.status(422).json({
      detail: "Use a query of 1–200 characters and page_size of 1–50."
    });
  }

  try {
    const result = await api.call("newsapi", {
      method: "GET",
      path: "/everything",
      query: {
        q: query.trim(),
        pageSize,
        language: "en",
        sortBy: "publishedAt"
      }
    });

    console.log("NEWSAPI RESULT:", result);

    if (
      result.status < 200 ||
      result.status >= 300 ||
      result.body?.status !== "ok"
    ) {
      console.error("NEWSAPI RESPONSE ERROR:", result);

      return res.status(502).json({
        status: "error",
        errorCode: result.body?.code ?? null,
        errorMessage: result.body?.message ?? "NewsAPI rejected the request",
        upstreamStatus: result.status
      });
    }

    const articles = normalizeArticles(
      result.body.articles || [],
      pageSize
    );

    return res.json({
      status: "ok",
      totalResults: articles.length,
      articles,
      mode: "live"
    });

  } catch (error) {
    console.error("NEWSAPI ERROR:", error);

    // Hatchable API connection has not been configured
    if (
      error?.code === "SetupRequired" ||
      error?.name === "SetupRequired"
    ) {
      const articles = normalizeArticles(
        DEMO_ARTICLES,
        pageSize
      );

      return res.json({
        status: "ok",
        totalResults: articles.length,
        articles,
        mode: "demo"
      });
    }

    // Return the actual error so we can diagnose it
    return res.status(502).json({
      status: "error",
      errorCode: error?.code ?? null,
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? String(error),
      errorDetails: error?.details ?? null
    });
  }
}
