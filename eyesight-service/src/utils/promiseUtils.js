/**
 * Execute promises in batches to avoid overwhelming database connections
 * @param {Array} items - Array of items to process
 * @param {Function} asyncFn - Async function to execute for each item
 * @param {number} batchSize - Number of concurrent promises (default: 5)
 * @returns {Promise<Array>} - Array of results
 */
const promiseAllInBatches = async (items, asyncFn, batchSize = 5) => {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
  }

  return results;
};

/**
 * Execute promises sequentially with optional delay
 * @param {Array} items - Array of items to process
 * @param {Function} asyncFn - Async function to execute for each item
 * @param {number} delayMs - Delay between executions in milliseconds (default: 0)
 * @returns {Promise<Array>} - Array of results
 */
const promiseSequential = async (items, asyncFn, delayMs = 0) => {
  const results = [];

  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const result = await asyncFn(item);
    results.push(result);

    if (delayMs > 0 && items.indexOf(item) < items.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  return results;
};

module.exports = {
  promiseAllInBatches,
  promiseSequential,
};
