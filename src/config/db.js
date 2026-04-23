const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id                  TEXT PRIMARY KEY,
        name                VARCHAR NOT NULL UNIQUE,
        gender              VARCHAR,
        gender_probability  FLOAT,
        sample_size         INTEGER,
        age                 INTEGER,
        age_group           VARCHAR,
        country_id          VARCHAR(2),
        country_name        VARCHAR,
        country_probability FLOAT,
        created_at          TEXT NOT NULL
      )
    `);
    // Add indexes for fast filtering
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gender      ON profiles(gender)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_age_group   ON profiles(age_group)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_country_id  ON profiles(country_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_age         ON profiles(age)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_created_at  ON profiles(created_at)`);
    tableReady = true;
    next();
  } catch (err) { next(err); }
}

init().catch(console.error);

module.exports = pool;