const listenersByTestId = new Map();

function subscribe(testId, listener) {
  const listeners = listenersByTestId.get(testId) || new Set();
  listeners.add(listener);
  listenersByTestId.set(testId, listeners);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      listenersByTestId.delete(testId);
    }
  };
}

function publish(test) {
  if (!test?.id) {
    return;
  }

  const listeners = listenersByTestId.get(test.id);

  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => listener(test));
}

module.exports = {
  subscribe,
  publish,
};
