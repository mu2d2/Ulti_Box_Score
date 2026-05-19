import crypto from "node:crypto";
import express from "express";
import { verifyGoogleIdToken } from "./auth/googleVerify.js";

const app = express();
const PORT = Number(process.env.API_PORT || 8787);

app.use(express.json({ limit: "1mb" }));

function requiredSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET || "";
  if (!secret) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }
  return secret;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signSessionToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", requiredSessionSecret())
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/google/verify", async (req, res) => {
  try {
    const credential = String(req.body?.credential || "").trim();
    const nonce = String(req.body?.nonce || "").trim();

    if (!credential) {
      return res.status(400).json({ error: "credential is required" });
    }

    const verified = await verifyGoogleIdToken(credential, nonce || undefined);

    const nowSec = Math.floor(Date.now() / 1000);
    const appExpirySec = nowSec + 60 * 60 * 12;
    const appToken = signSessionToken({
      sub: verified.sub,
      email: verified.email,
      iat: nowSec,
      exp: appExpirySec,
      iss: "ulti-box-score-api",
    });

    return res.json({
      teamEmail: verified.email,
      teamName: verified.name,
      picture: verified.picture,
      authToken: appToken,
      expiresAt: new Date(appExpirySec * 1000).toISOString(),
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Google token verification failed." });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth API listening on http://localhost:${PORT}`);
});
