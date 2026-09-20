// User Store — Registration, authentication, session management.
// Backed by Firestore. Session tokens are stateless HMAC-signed (no DB lookup needed for verification).
// Password hashing via Node crypto (scrypt).

import crypto from "crypto";
import { collection, getNextUserId } from "./db.js";

// Password hashing using scrypt (Node built-in, no dependencies)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

// Session token generation (stateless — no DB needed to verify)
function generateToken(userId) {
  const payload = `${userId}:${Date.now()}`;
  const secret = process.env.SESSION_SECRET || "csuite-advisors-secret-key-change-me";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const userId = parts[0];
  const timestamp = parts[1];
  const signature = parts[2];
  const secret = process.env.SESSION_SECRET || "csuite-advisors-secret-key-change-me";
  const expectedSig = crypto.createHmac("sha256", secret).update(`${userId}:${timestamp}`).digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) return null;

  // Token expires after 7 days
  const age = Date.now() - parseInt(timestamp);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  return parseInt(userId);
}

// Strip sensitive fields for API responses
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

// --- Public API ---

export async function registerUser(email, password, name) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existing = await collection("users")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { error: "An account with this email already exists" };
  }

  const id = await getNextUserId();
  const user = {
    id,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    tosAccepted: true,
    tosAcceptedAt: new Date().toISOString(),
  };

  await collection("users").doc(String(id)).set(user);

  return {
    user: publicUser(user),
    token: generateToken(id),
  };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const snap = await collection("users")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "Invalid email or password" };
  }

  const user = snap.docs[0].data();
  if (!verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password" };
  }

  return {
    user: publicUser(user),
    token: generateToken(user.id),
  };
}

export async function getUserById(userId) {
  const doc = await collection("users").doc(String(userId)).get();
  if (!doc.exists) return null;
  return publicUser(doc.data());
}

export function verifyAuthToken(token) {
  return verifyToken(token);
}

export async function getUserDataDir(userId) {
  // Kept for backward compat — no longer needed with Firestore,
  // but some code may reference it. Returns null.
  return null;
}

// --- Google OAuth Login ---

/**
 * Verify a Google ID token and return the user info.
 * Uses Google's tokeninfo endpoint (no external deps needed).
 */
async function verifyGoogleToken(idToken, expectedClientId) {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const payload = await res.json();

  // Verify the audience matches our client ID
  if (expectedClientId && payload.aud !== expectedClientId) {
    return null;
  }

  // Verify the token is not expired
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    return null;
  }

  return {
    googleId: payload.sub,
    email: payload.email?.toLowerCase().trim(),
    name: payload.name || payload.email?.split("@")[0],
    emailVerified: payload.email_verified === "true",
  };
}

/**
 * Login or register a user via Google OAuth.
 * If the user exists (by googleId or email), returns a session token.
 * If not, creates a new user.
 */
export async function loginWithGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { error: "Google OAuth is not configured" };
  }

  const googleUser = await verifyGoogleToken(idToken, clientId);
  if (!googleUser || !googleUser.email) {
    return { error: "Invalid Google token" };
  }

  // Look for existing user by googleId first
  let snap = await collection("users")
    .where("googleId", "==", googleUser.googleId)
    .limit(1)
    .get();

  let user;
  if (!snap.empty) {
    user = snap.docs[0].data();
  } else {
    // Try by email
    snap = await collection("users")
      .where("email", "==", googleUser.email)
      .limit(1)
      .get();

    if (!snap.empty) {
      user = snap.docs[0].data();
      // Update googleId if this is the first Google login for an existing email user
      if (!user.googleId) {
        await collection("users").doc(String(user.id)).update({
          googleId: googleUser.googleId,
        });
        user.googleId = googleUser.googleId;
      }
    } else {
      // Create a new user from Google profile
      const id = await getNextUserId();
      user = {
        id,
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        passwordHash: null,
        createdAt: new Date().toISOString(),
        tosAccepted: true,
        tosAcceptedAt: new Date().toISOString(),
      };
      await collection("users").doc(String(id)).set(user);
    }
  }

  return {
    user: publicUser(user),
    token: generateToken(user.id),
  };
}
