/**
 * Compatibility entry point.
 * Prefer `npm start` / `node server.js` — both use the single startup path.
 */
import { startServer } from './server.js';

export { createApp } from './app.js';
export { startServer } from './server.js';

const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index'));

if (isDirectRun) {
  await startServer().catch(() => {
    process.exit(1);
  });
}
