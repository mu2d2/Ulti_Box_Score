import { verifySessionToken } from "../utils/tokenUtils.js";

/**
 * Express middleware that verifies the Bearer token in the Authorization header.
 * On success, attaches `req.tokenPayload` (decoded JWT claims including accountId).
 * Returns 401 on any failure.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  try {
    req.tokenPayload = verifySessionToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || "Unauthorized." });
  }
}
