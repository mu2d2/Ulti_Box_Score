import { Router } from "express";
import { verifyGoogleIdToken } from "../auth/googleVerify.js";
import { signSessionToken } from "../utils/tokenUtils.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { pool } from "../db/pool.js";

const router = Router();

/**
 * POST /api/auth/google/verify
 * Verifies the Google ID token, upserts the account row, and returns a signed
 * session token that includes the internal accountId.
 */
router.post("/google/verify", async (req, res) => {
  try {
    const credential = String(req.body?.credential || "").trim();
    const nonce = String(req.body?.nonce || "").trim();

    if (!credential) {
      return res.status(400).json({ error: "credential is required" });
    }

    const verified = await verifyGoogleIdToken(credential, nonce || undefined);

    // Upsert account — preserve team_name if the user has already customised it.
    const result = await pool.query(
      `INSERT INTO accounts (email, google_sub, team_name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         google_sub  = EXCLUDED.google_sub,
         picture     = EXCLUDED.picture,
         team_name   = CASE
                         WHEN accounts.team_name = '' THEN EXCLUDED.team_name
                         ELSE accounts.team_name
                       END,
         updated_at  = NOW()
       RETURNING id, email, team_name, picture`,
      [verified.email, verified.sub, verified.name || "", verified.picture || ""]
    );

    const account = result.rows[0];

    const nowSec = Math.floor(Date.now() / 1000);
    const appExpirySec = nowSec + 60 * 60 * 12;

    const appToken = signSessionToken({
      sub: verified.sub,
      email: verified.email,
      accountId: account.id,
      iat: nowSec,
      exp: appExpirySec,
      iss: "ulti-box-score-api",
    });

    return res.json({
      teamEmail: verified.email,
      teamName: account.team_name || verified.name,
      picture: account.picture,
      authToken: appToken,
      expiresAt: new Date(appExpirySec * 1000).toISOString(),
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Google token verification failed." });
  }
});

/**
 * PUT /api/auth/account
 * Updates the team name for the authenticated account.
 */
router.put("/account", requireAuth, async (req, res) => {
  try {
    const { accountId } = req.tokenPayload;
    const teamName = String(req.body?.teamName || "").trim();

    if (!teamName) {
      return res.status(400).json({ error: "teamName is required" });
    }

    await pool.query(
      "UPDATE accounts SET team_name = $1, updated_at = NOW() WHERE id = $2",
      [teamName, accountId]
    );

    return res.json({ teamName });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
