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

  const firstNames = [
    "jim",
    "joe",
    "bob",
    "linda",
    "jane",
    "tim",
    "laura",
    "mary",
    "carey",
    "biff",
    "james",
    "tom",
    "john",
    "mike",
    "mark",
    "ned",
    "oscar",
    "pat",
    "sam",
    "dave",
    "steve",
    "kevin",
    "brian",
    "dan",
    "doug",
    "gary",
    "brad",
    "chad",
    "jeff",
    "scott",
    "greg",
    "matt",
    "paul",
    "eric",
    "keith",
    "shawn",
    "todd",
    "randy",
    "cliff",
    "susan",
    "karen",
    "debbie",
    "nancy",
    "barb",
    "pam",
    "cindy",
    "becky",
    "heather",
    "amy",
    "tracy",
    "brenda",
    "diane",
    "tina",
    "julie",
    "kelly",
    "bill",
    "rick",
    "ron",
    "larry",
    "terry",
    "wayne",
    "allen",
    "dennis",
    "harry",
    "ken",
    "lee",
    "ray",
    "roy",
    "ed",
    "fred",
    "phil",
    "glenn",
    "neal",
    "dale",
    "kurt",
    "ann",
    "beth",
    "carol",
    "joan",
    "janet",
    "judy",
    "marie",
    "lori",
    "vicki",
    "shelly",
    "sally",
    "bonnie",
    "patty",
    "kathy",
    "wendy",
    "gina",
    "holly",
    "teri",
    "stacy",
    "christina",
    "jason",
    "aaron",
    "adam",
    "ryan",
    "josh",
    "nick",
    "chris",
    "justin",
    "tyler",
    "zach",
  ] as const;

  const lastNames = [
    "Smith",
    "Smyth",
    "Johnson",
    "Jonson",
    "Johnsen",
    "Jones",
    "Brown",
    "Browne",
    "Miller",
    "Mills",
    "Davis",
    "Davies",
    "Wilson",
    "Willson",
    "Taylor",
    "Tailor",
    "Clark",
    "Clarke",
    "Lewis",
    "Louis",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "King",
    "Wright",
    "Scott",
    "Green",
    "Adams",
    "Hill",
    "Moore",
    "Moors",
    "Parker",
    "Turner",
    "Phillips",
    "Philip",
    "Edwards",
    "Stewart",
    "Stuart",
    "Morris",
    "Rogers",
    "Reed",
    "Cook",
    "Bell",
    "Bailey",
    "Gray",
    "Grey",
    "Ward",
    "Baker",
    "Carter",
    "Mitchell",
    "Collins",
    "Campbell",
    "Morgan",
    "Brooks",
    "Russell",
    "Howard",
    "Powell",
    "Powel",
    "Foster",
    "Coleman",
    "Jenkins",
    "Perry",
    "Long",
    "Patterson",
    "Hughes",
    "Butler",
    "Simmons",
    "Bryant",
    "Hayes",
    "Myers",
    "Fisher",
    "Porter",
    "Barnes",
    "Harris",
    "Cole",
    "West",
    "Ford",
    "Stone",
    "Wood",
    "Price",
    "Rice",
    "Lane",
    "Page",
    "Shaw",
    "Day",
    "Kent",
    "Dean",
    "Boyd",
    "Rose",
    "Cross",
    "Grant",
    "Knight",
    "Fox",
    "Coleman",
    "Powel",
    "Smithson",
  ] as const;

  const desiredTotal = Math.min(targetCount, firstNames.length);

  if (existing >= desiredTotal) {
    console.log(`DB already has ${existing} users (target=${desiredTotal}).`);
    return;
  }

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

  // Deterministic: one user per first name, in order.
  for (let idx = existing; idx < desiredTotal; idx += 1) {
    const firstName = firstNames[idx];
    const lastName = pick(lastNames);

    const start = new Date(1955, 0, 1).getTime();
    const end = new Date(2006, 11, 31).getTime();
    const birthday = new Date(randInt(start, end));
    const birthdayIso = toIsoDateOnly(birthday);
    const age = computeAge(birthday, today);

    const email = `${normalizeEmailPart(firstName)}@example.com`;

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
