const profileService = require('../services/profile.service');
const { parseQuery }  = require('../services/nlp.service');

async function getAll(req, res, next) {
  try {
    const result = await profileService.getAllProfiles(req.query);
    return res.status(200).json({
      status: 'success',
      page:   result.page,
      limit:  result.limit,
      total:  result.total,
      data:   result.data,
    });
  } catch (err) { next(err); }
}

async function search(req, res, next) {
  try {
    const { q, page, limit } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ status: 'error', message: 'Missing or empty query parameter: q' });
    }

    const filters = parseQuery(q);
    if (!filters) {
      return res.status(400).json({ status: 'error', message: 'Unable to interpret query' });
    }

    const result = await profileService.searchProfiles(filters, { page, limit });
    return res.status(200).json({
      status: 'success',
      page:   result.page,
      limit:  result.limit,
      total:  result.total,
      data:   result.data,
    });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const profile = await profileService.getProfileById(req.params.id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.status(200).json({ status: 'success', data: profile });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    const result = await profileService.createProfile(name.trim());
    if (result.alreadyExists) {
      return res.status(200).json({ status: 'success', message: 'Profile already exists', data: result.data });
    }
    return res.status(201).json({ status: 'success', data: result.data });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await profileService.deleteProfile(req.params.id);
    if (!deleted) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { getAll, search, getOne, create, remove };