import { getDb } from "./db";

export type UserRow = {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  birthday: string; // ISO date string: "YYYY-MM-DD"
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailExists(email: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 AS one FROM users WHERE email = ? LIMIT 1")
    .get(normalizeEmail(email));

  return Boolean(row);
}

export function getUserByEmail(email: string): UserRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          id,
          email,
          password,
          firstName,
          lastName,
          age,
          birthday
        FROM users
        WHERE email = ?
        LIMIT 1
      `
    )
    .get(normalizeEmail(email)) as UserRow | undefined;

  return row ?? null;
}

export function listUsers(input?: { limit?: number; offset?: number }): UserRow[] {
  const db = getDb();

  const limit = Math.max(1, Math.min(200, input?.limit ?? 20));
  const offset = Math.max(0, input?.offset ?? 0);

  return db
    .prepare(
      `
        SELECT
          id,
          email,
          password,
          firstName,
          lastName,
          age,
          birthday
        FROM users
        ORDER BY id ASC
        LIMIT ?
        OFFSET ?
      `
    )
    .all(limit, offset) as UserRow[];
}

export function createUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  birthday: string; // "YYYY-MM-DD"
}): void {
  const db = getDb();

  db.prepare(
    `
      INSERT INTO users (
        email,
        password,
        firstName,
        lastName,
        age,
        birthday
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    normalizeEmail(input.email),
    input.password,
    input.firstName,
    input.lastName,
    input.age,
    input.birthday
  );
}
