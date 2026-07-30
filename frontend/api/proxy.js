/**
 * Vercel Serverless Proxy
 * Route: /api/* → forward sang backend HTTP
 */

const BACKEND = "http://103.190.38.46:3000/api";

export default async function handler(req, res) {
  const pathStr = req.query.path || "";

  // Thu thập toàn bộ query parameters ngoại trừ "path" để chuyển tiếp lên backend
  const queryParams = { ...req.query };
  delete queryParams.path;
  const searchParams = new URLSearchParams(queryParams);
  const qs = searchParams.toString();

  const target = `${BACKEND}/${pathStr}${qs ? `?${qs}` : ""}`;

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
