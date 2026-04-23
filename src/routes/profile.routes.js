const { Router } = require('express');
const controller  = require('../controllers/profile.controller');

const router = Router();
router.get('/search', controller.search);
router.get('/',       controller.getAll);
router.get('/:id',    controller.getOne);
router.post('/',      controller.create);
router.delete('/:id', controller.remove);

module.exports = router;