const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Store the browser binary inside the project directory so Render retains it during runtime
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
