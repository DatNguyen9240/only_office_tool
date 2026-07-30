/**
 * Vercel Serverless Proxy – /api/[...path]
 * Tất cả request đến /api/* sẽ được forward sang backend HTTP.
 * Node.js runtime không bị giới hạn Mixed Content như trình duyệt.
 */

const BACKEND = "http://103.190.38.46/api";

export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : [];

  const url = new URL(req.url, "http://localhost");
  url.searchParams.delete("path");
  const qs = url.search;

  const target = `${BACKEND}/${segments.join("/")}${qs}`;

  const forwardHeaders = {};
  for (const key of ["content-type", "authorization", "accept", "accept-language"]) {
    if (req.headers[key]) forwardHeaders[key] = req.headers[key];
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody
    ? typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body)
    : undefined;

  if (hasBody && !forwardHeaders["content-type"]) {
    forwardHeaders["content-type"] = "application/json";
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err);
    return res.status(502).json({ message: "Backend unreachable" });
  }

  res.status(upstream.status);
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);
  res.send(await upstream.text());
}
