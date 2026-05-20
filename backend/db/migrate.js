/**
 * Applies all SQL migrations in order.
 * Run with: node --env-file=.env.local backend/db/migrate.js
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  join(__dirname, "migrations", "001_initial.sql"),
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const filePath of MIGRATIONS) {
      const sql = readFileSync(filePath, "utf8");
      // eslint-disable-next-line no-console
      console.log(`Applying: ${filePath}`);
      await client.query(sql);
      // eslint-disable-next-line no-console
      console.log("  ✓ done");
    }
    // eslint-disable-next-line no-console
    console.log("All migrations applied.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err.message);
  process.exit(1);
});
