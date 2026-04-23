require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running migration...');

  // Add country_name if it doesn't exist
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS country_name VARCHAR DEFAULT ''
  `);

  // Add sample_size if it doesn't exist (also missing from Stage 1)
  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS sample_size INTEGER DEFAULT 0
  `);

  // Add indexes for performance
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_gender     ON profiles(gender)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_age_group  ON profiles(age_group)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_country_id ON profiles(country_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_age        ON profiles(age)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_created_at ON profiles(created_at)`);

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch(err => { console.error(err); process.exit(1); });