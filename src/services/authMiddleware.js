// Auth Middleware — Extracts and validates the session token from requests.
// Attaches the user object to req.user if authenticated.
// Works with Bearer token (Authorization header) or cookie-based sessions.

import { verifyAuthToken, getUserById } from "./userStore.js";

export function authRequired(req, res, next) {
  // Try Authorization header first
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Fall back to cookie
  if (!token && req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(";").map((c) => c.trim().split("="))
    );
    token = cookies.session;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userId = verifyAuthToken(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const user = getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  req.user = user;
  next();
}

// Optional auth — attaches user if token present, but doesn't block
export function authOptional(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  if (!token && req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(";").map((c) => c.trim().split("="))
    );
    token = cookies.session;
  }

  if (token) {
    const userId = verifyAuthToken(token);
    if (userId) {
      const user = getUserById(userId);
      if (user) req.user = user;
    }
  }

  next();
}
