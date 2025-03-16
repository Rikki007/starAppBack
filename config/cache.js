const NodeCache = require('node-cache');

module.exports = new NodeCache({
  stdTTL: 3600, // 1 час
  checkperiod: 600,
  useClones: false
});