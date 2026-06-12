const loadTestService = require('../services/loadTestService');

async function createTest(req, res, next) {
  try {
    const test = await loadTestService.createTest(req.body);
    res.status(202).json({
      message: 'Load test accepted',
      test,
    });
  } catch (error) {
    next(error);
  }
}

async function getTest(req, res, next) {
  try {
    const test = await loadTestService.getTest(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Load test not found' });
    }

    return res.json(test);
  } catch (error) {
    next(error);
  }
}

async function listTests(req, res, next) {
  try {
    const tests = await loadTestService.listTests(req.query);
    res.json({ count: tests.length, tests });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTest,
  getTest,
  listTests,
};
