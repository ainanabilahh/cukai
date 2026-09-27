import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:income_tax.db");
  await migrate(_db);
  return _db;
}

async function migrate(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS deductions (
      id          TEXT PRIMARY KEY,
      year        INTEGER NOT NULL,
      category    TEXT NOT NULL,
      amount      REAL NOT NULL,
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      frequency   TEXT NOT NULL DEFAULT 'yearly',
      month       TEXT,
      receipt_images TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ea_forms (
      id            TEXT PRIMARY KEY,
      employer_name TEXT NOT NULL,
      file_name     TEXT NOT NULL,
      file_type     TEXT NOT NULL,
      uploaded_at   TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS be_forms (
      id          TEXT PRIMARY KEY,
      year        INTEGER NOT NULL,
      file_name   TEXT NOT NULL,
      file_type   TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

/** Years of assessment that have claims or a BE form, newest first. */
export async function getYearsWithData(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ year: number }[]>(
    "SELECT year FROM deductions UNION SELECT year FROM be_forms ORDER BY year DESC"
  );
  return rows.map((r) => Number(r.year));
}
