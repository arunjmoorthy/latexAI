const { override, disableEsLint } = require('customize-cra');

module.exports = override(
  // Disable ESLint in webpack
  disableEsLint()
); 