import crypto from "node:crypto";

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

/**
 * Signs a payload as a minimal HS256 JWT using APP_SESSION_SECRET.
 */
export function signSessionToken(payload) {
  const secret = process.env.APP_SESSION_SECRET || "";
  if (!secret) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a token produced by signSessionToken.
 * Throws on invalid signature or expiry.
 */
export function verifySessionToken(token) {
  const secret = process.env.APP_SESSION_SECRET || "";
  if (!secret) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  const parts = (token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (signature !== expectedSig) {
    throw new Error("Invalid token signature.");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Malformed token payload.");
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token has expired.");
  }

  return payload;
}
