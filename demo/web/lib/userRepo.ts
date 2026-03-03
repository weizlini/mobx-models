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

export function emailExists(email: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 AS one FROM users WHERE email = ? LIMIT 1")
    .get(email.trim().toLowerCase());

  return Boolean(row);
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
    input.email.trim().toLowerCase(),
    input.password,
    input.firstName,
    input.lastName,
    input.age,
    input.birthday
  );
}
