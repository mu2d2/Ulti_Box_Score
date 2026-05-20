import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Set it in .env.local.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set ssl: { rejectUnauthorized: false } for hosted providers like Railway or Render.
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected idle client error:", err.message);
});
