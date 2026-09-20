// User Store — Registration, authentication, session management
// File-based user storage with bcrypt-style password hashing via Node crypto.
// Each user has isolated data directories for settings, memory, and knowledge files.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve("data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], nextId: 1 }, null, 2));
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return { users: [], nextId: 1 };
  }
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// Password hashing using scrypt (Node built-in, no dependencies)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

// Session token generation
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

// --- Public API ---

export function registerUser(email, password, name) {
  const data = readUsers();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  if (data.users.some((u) => u.email === normalizedEmail)) {
    return { error: "An account with this email already exists" };
  }

  const user = {
    id: data.nextId++,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    tosAccepted: true, // ToS acceptance tracked at registration time
    tosAcceptedAt: new Date().toISOString(),
  };

  data.users.push(user);
  writeUsers(data);

  // Create per-user data directory
  const userDir = path.join(DATA_DIR, `user-${user.id}`);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    token: generateToken(user.id),
  };
}

export function loginUser(email, password) {
  const data = readUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = data.users.find((u) => u.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password" };
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    token: generateToken(user.id),
  };
}

export function getUserById(userId) {
  const data = readUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

export function verifyAuthToken(token) {
  return verifyToken(token);
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

  const data = readUsers();

  // Look for existing user by googleId first, then by email
  let user = data.users.find((u) => u.googleId === googleUser.googleId);
  if (!user) {
    user = data.users.find((u) => u.email === googleUser.email);
  }

  if (user) {
    // Update googleId if this is the first Google login for an existing email user
    if (!user.googleId) {
      user.googleId = googleUser.googleId;
      writeUsers(data);
    }
  } else {
    // Create a new user from Google profile
    user = {
      id: data.nextId++,
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.googleId,
      passwordHash: null, // Google users don't have a password
      createdAt: new Date().toISOString(),
      tosAccepted: true,
      tosAcceptedAt: new Date().toISOString(),
    };
    data.users.push(user);
    writeUsers(data);

    // Create per-user data directory
    const userDir = path.join(DATA_DIR, `user-${user.id}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    token: generateToken(user.id),
  };
}
