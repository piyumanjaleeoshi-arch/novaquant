import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface UserData {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role?: string;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
  passwordHash?: string;
  password_hash?: string;
  email_verified?: boolean;
  verification_code?: string | null;
  verification_expiry?: number | null;
  financial_loss_agreed?: boolean;
  financial_agreement_timestamp?: string;
  encryptedBinanceApiKey?: string;
  encryptedBinanceApiSecret?: string;
  plan?: string;
}

const USERS_FILE = path.join(process.cwd(), "users_db.json");

/**
 * Ensures the database file exists with the specified { "users": [] } design.
 */
export async function ensureDatabaseExists(): Promise<void> {
  try {
    if (!existsSync(USERS_FILE)) {
      const initialDb = { users: [] };
      await fs.writeFile(USERS_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      console.log("[LocalDB] Initialized new users_db.json database successfully.");
    }
  } catch (error) {
    console.error("[LocalDB] Error ensuring database exists:", error);
  }
}

/**
 * Loads all users from the users_db.json file.
 * Returns an empty array if the file does not exist or JSON parsing fails.
 */
export async function loadUsers(): Promise<UserData[]> {
  try {
    await ensureDatabaseExists();
    const data = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed && Array.isArray(parsed.users)) {
      return parsed.users;
    } else if (Array.isArray(parsed)) {
      // Legacy support if file contents are plain array
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn("[LocalDB] JSON syntax error detected or file unreadable. Returning safe blank state:", e);
    return [];
  }
}

/**
 * Saves users back to the users_db.json file using { "users": [] } root structure.
 */
export async function saveUsers(users: UserData[]): Promise<void> {
  try {
    const dbObject = { users };
    await fs.writeFile(USERS_FILE, JSON.stringify(dbObject, null, 2), "utf-8");
  } catch (e) {
    console.error("[LocalDB] Failed writing backup state to file system:", e);
  }
}

/**
 * Locates a user by email address (case-insensitive, trimmed).
 */
export async function findUserByEmail(email: string): Promise<UserData | null> {
  if (!email) return null;
  const users = await loadUsers();
  const emailLower = email.toLowerCase().trim();
  const user = users.find(u => u.email.toLowerCase().trim() === emailLower);
  return user || null;
}

/**
 * Locates a user by ID.
 */
export async function findUserById(id: string): Promise<UserData | null> {
  if (!id) return null;
  const users = await loadUsers();
  const user = users.find(u => u.id === id);
  return user || null;
}

/**
 * Appends a new user profile record to the database file.
 */
export async function addUser(user: UserData): Promise<void> {
  const users = await loadUsers();
  users.push(user);
  await saveUsers(users);
}

/**
 * Updates a user's database properties by finding matching reference id.
 */
export async function updateUser(id: string, updates: Partial<UserData>): Promise<void> {
  const users = await loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    await saveUsers(users);
  }
}

/**
 * Deletes a user record by ID.
 */
export async function deleteUser(id: string): Promise<boolean> {
  const users = await loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users.splice(idx, 1);
    await saveUsers(users);
    return true;
  }
  return false;
}

