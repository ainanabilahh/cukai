import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

/** Opens the database once; every caller waits for the same load and migration. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load("sqlite:income_tax.db");
      await migrate(db);
      return db;
    })().catch((err) => {
      dbPromise = null; // allow a retry after a failed open
      throw err;
    });
  }
  return dbPromise;
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

  const eaColumns = await db.select<{ name: string }[]>("PRAGMA table_info(ea_forms)");
  if (!eaColumns.some((c) => c.name === "year")) {
    // Older EA forms have no year (NULL) and are shown under every year
    await db.execute("ALTER TABLE ea_forms ADD COLUMN year INTEGER");
  }

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

/** True when any claim or form still refers to this stored file. */
export async function isFileReferenced(filePath: string): Promise<boolean> {
  const db = await getDb();
  const quoted = `%${JSON.stringify(filePath)}%`; // receipt_images holds a JSON array of paths
  const rows = await db.select<{ n: number }[]>(
    `SELECT
       (SELECT COUNT(*) FROM deductions WHERE receipt_images LIKE ?) +
       (SELECT COUNT(*) FROM ea_forms WHERE file_name = ?) +
       (SELECT COUNT(*) FROM be_forms WHERE file_name = ?) AS n`,
    [quoted, filePath, filePath]
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

/** Years of assessment that have claims or a BE form, newest first. */
export async function getYearsWithData(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ year: number }[]>(
    `SELECT year FROM deductions
     UNION SELECT year FROM be_forms
     UNION SELECT year FROM ea_forms WHERE year IS NOT NULL
     ORDER BY year DESC`
  );
  return rows.map((r) => Number(r.year));
}
