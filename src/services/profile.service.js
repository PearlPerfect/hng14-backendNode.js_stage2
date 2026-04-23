const pool = require('../config/db');
const uuidv7 = require('../utils/uuidv7');
const { getAgeGroup, getTopCountry } = require('../utils/classify');
const { fetchGenderize, fetchAgify, fetchNationalize } = require('./external.service');

// ── helpers ──
const VALID_SORT_FIELDS = ['age', 'created_at', 'gender_probability'];
const VALID_ORDER = ['asc', 'desc'];

function buildWhereClause(filters, startIndex = 1) {
  const conditions = [];
  const params = [];
  let i = startIndex;

  if (filters.gender) {
    conditions.push(`LOWER(gender) = LOWER($${i++})`);
    params.push(filters.gender);
  }
  if (filters.age_group) {
    conditions.push(`LOWER(age_group) = LOWER($${i++})`);
    params.push(filters.age_group);
  }
  if (filters.country_id) {
    conditions.push(`LOWER(country_id) = LOWER($${i++})`);
    params.push(filters.country_id);
  }
  if (filters.min_age !== undefined) {
    conditions.push(`age >= $${i++}`);
    params.push(Number(filters.min_age));
  }
  if (filters.max_age !== undefined) {
    conditions.push(`age <= $${i++}`);
    params.push(Number(filters.max_age));
  }
  if (filters.min_gender_probability !== undefined) {
    conditions.push(`gender_probability >= $${i++}`);
    params.push(Number(filters.min_gender_probability));
  }
  if (filters.min_country_probability !== undefined) {
    conditions.push(`country_probability >= $${i++}`);
    params.push(Number(filters.min_country_probability));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

async function getAllProfiles(query) {
  const {
    gender, age_group, country_id,
    min_age, max_age,
    min_gender_probability, min_country_probability,
    sort_by = 'created_at',
    order = 'asc',
    page = 1,
    limit = 10,
  } = query;

  // Validate sort/order
  const sortField = VALID_SORT_FIELDS.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = VALID_ORDER.includes(order?.toLowerCase()) ? order.toUpperCase() : 'ASC';

  const pageNum  = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const offset   = (pageNum - 1) * limitNum;

  const { where, params } = buildWhereClause({
    gender, age_group, country_id,
    min_age, max_age,
    min_gender_probability, min_country_probability,
  });

  // Count total matching rows (for pagination metadata)
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM profiles ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Fetch page
  const dataResult = await pool.query(
    `SELECT * FROM profiles ${where}
     ORDER BY ${sortField} ${sortOrder}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  return { total, page: pageNum, limit: limitNum, data: dataResult.rows };
}

async function searchProfiles(filters, query) {
  const {
    page = 1,
    limit = 10,
  } = query;

  const pageNum  = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const offset   = (pageNum - 1) * limitNum;

  const { where, params } = buildWhereClause(filters);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM profiles ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM profiles ${where}
     ORDER BY created_at ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  return { total, page: pageNum, limit: limitNum, data: dataResult.rows };
}

async function getProfileById(id) {
  const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createProfile(name) {
  const existing = await pool.query(
    'SELECT * FROM profiles WHERE LOWER(name) = LOWER($1)', [name]
  );
  if (existing.rows.length > 0) {
    return { alreadyExists: true, data: existing.rows[0] };
  }

  const [genderData, agifyData, nationalizeData] = await Promise.all([
    fetchGenderize(name),
    fetchAgify(name),
    fetchNationalize(name),
  ]);

  const topCountry = getTopCountry(nationalizeData.countries);
  const ageGroup   = getAgeGroup(agifyData.age);

  const profile = {
    id: uuidv7(),
    name: name.toLowerCase(),
    gender: genderData.gender,
    gender_probability: genderData.gender_probability,
    sample_size: genderData.sample_size,
    age: agifyData.age,
    age_group: ageGroup,
    country_id: topCountry.country_id,
    country_name: topCountry.country_name || '',
    country_probability: topCountry.probability,
    created_at: new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO profiles
      (id, name, gender, gender_probability, sample_size, age, age_group,
       country_id, country_name, country_probability, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      profile.id, profile.name, profile.gender, profile.gender_probability,
      profile.sample_size, profile.age, profile.age_group,
      profile.country_id, profile.country_name, profile.country_probability,
      profile.created_at,
    ]
  );

  return { alreadyExists: false, data: profile };
}

async function deleteProfile(id) {
  const result = await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { getAllProfiles, searchProfiles, getProfileById, createProfile, deleteProfile };