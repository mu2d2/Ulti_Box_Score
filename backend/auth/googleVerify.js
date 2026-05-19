import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "");

export async function verifyGoogleIdToken(idToken, expectedNonce) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Google token payload is missing.");
  }

  if (!payload.email || !payload.email_verified) {
    throw new Error("Google email is missing or not verified.");
  }

  const expiresAtMs = Number(payload.exp || 0) * 1000;
  if (!expiresAtMs || expiresAtMs < Date.now()) {
    throw new Error("Google token has expired.");
  }

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error("Nonce mismatch.");
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || "",
    sub: payload.sub,
    emailVerified: Boolean(payload.email_verified),
    expiresAtMs,
  };
}
