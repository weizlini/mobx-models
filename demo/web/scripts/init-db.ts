import { getDb, getDbPath } from "../lib/db";

type CountRow = { count: number };

function toIsoDateOnly(d: Date): string {
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function randInt(minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function computeAge(birthday: Date, today: Date): number {
  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age -= 1;
  return age;
}

function normalizeEmailPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

function ensureSchema(): void {
  const db = getDb();

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      age INTEGER NOT NULL,
      birthday TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

function seedUsers(targetCount: number): void {
  const db = getDb();
  const today = new Date();

  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as CountRow;

  const existing = Number(row?.count ?? 0);
  if (existing >= targetCount) {
    console.log(`DB already has ${existing} users (target=${targetCount}).`);
    return;
  }

  const firstNames = [
    "Ava",
    "Noah",
    "Mia",
    "Liam",
    "Sophia",
    "Ethan",
    "Isabella",
    "Lucas",
    "Amelia",
    "Mateo",
    "Camila",
    "Santiago",
    "Valentina",
    "Sebastián",
    "Lucía",
    "Diego",
    "Renata",
    "Daniel",
    "Elena",
    "Leo",
  ] as const;

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernández",
    "López",
    "González",
    "Pérez",
    "Sánchez",
    "Ramírez",
    "Flores",
    "Torres",
    "Rivera",
    "Vargas",
  ] as const;

  const insert = db.prepare(
    `
      INSERT INTO users (email, password, firstName, lastName, age, birthday)
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim()
  );

  const insertMany = db.transaction(
    (
      rows: Array<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        age: number;
        birthday: string;
      }>
    ) => {
      for (const r of rows) {
        insert.run(r.email, r.password, r.firstName, r.lastName, r.age, r.birthday);
      }
    }
  );

  const rowsToInsert: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    age: number;
    birthday: string;
  }> = [];

  const usedEmails = new Set<string>();

  for (let i = existing + 1; i <= targetCount; i += 1) {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);

    const start = new Date(1955, 0, 1).getTime();
    const end = new Date(2006, 11, 31).getTime();
    const birthday = new Date(randInt(start, end));
    const birthdayIso = toIsoDateOnly(birthday);
    const age = computeAge(birthday, today);

    const base = `${normalizeEmailPart(firstName)}.${normalizeEmailPart(lastName)}`;
    const suffix = String(i).padStart(3, "0");
    let email = `${base}${suffix}@example.com`;

    while (usedEmails.has(email) || db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      const extra = randInt(1, 9999);
      email = `${base}${suffix}.${extra}@example.com`;
    }
    usedEmails.add(email);

    rowsToInsert.push({
      email,
      password: "password123",
      firstName,
      lastName,
      age,
      birthday: birthdayIso,
    });
  }

  insertMany(rowsToInsert);

  const finalRow = db.prepare("SELECT COUNT(*) AS count FROM users").get() as CountRow;

  console.log(
    `Seeded ${rowsToInsert.length} users. Total users now: ${Number(finalRow?.count ?? 0)}.`
  );
}

function main(): void {
  ensureSchema();
  seedUsers(100);
  console.log(`DB path: ${getDbPath()}`);
}

main();
