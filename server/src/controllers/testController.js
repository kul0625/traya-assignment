const loadTestService = require('../services/loadTestService');
const testEventService = require('../services/testEventService');

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

async function streamTestEvents(req, res, next) {
  try {
    const test = await loadTestService.getTest(req.params.id);

    if (!test) {
      return res.status(404).json({ error: 'Load test not found' });
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();

    const send = (updatedTest) => {
      res.write('event: test-update\n');
      res.write(`data: ${JSON.stringify(updatedTest)}\n\n`);
    };

    send(test);

    if (['completed', 'failed'].includes(test.status)) {
      res.end();
      return undefined;
    }

    const unsubscribe = testEventService.subscribe(req.params.id, (updatedTest) => {
      send(updatedTest);

      if (['completed', 'failed'].includes(updatedTest.status)) {
        unsubscribe();
        res.end();
      }
    });

    req.on('close', unsubscribe);
    return undefined;
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTest,
  getTest,
  listTests,
  streamTestEvents,
};
