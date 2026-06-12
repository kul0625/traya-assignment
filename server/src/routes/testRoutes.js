const express = require('express');
const testController = require('../controllers/testController');

const router = express.Router();

router.post('/', testController.createTest);
router.get('/', testController.listTests);
router.get('/:id', testController.getTest);

module.exports = router;
