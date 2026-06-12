const LoadTest = require('../models/loadTestSchema');

function normalize(test) {
  if (!test) {
    return null;
  }

  const plain = typeof test.toJSON === 'function' ? test.toJSON() : test;

  if (plain.metrics?.statusCodes instanceof Map) {
    plain.metrics.statusCodes = Object.fromEntries(plain.metrics.statusCodes);
  }

  return plain;
}

async function create(test) {
  const created = await LoadTest.create(test);
  return normalize(created);
}

async function update(id, patch) {
  const updated = await LoadTest.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" },
  );

  return normalize(updated);
}

async function findById(id) {
  const test = await LoadTest.findOne({ id });
  return normalize(test);
}

async function findAll() {
  const tests = await LoadTest.find().sort({ createdAt: -1 });
  return tests.map(normalize);
}

module.exports = {
  create,
  update,
  findById,
  findAll,
};
