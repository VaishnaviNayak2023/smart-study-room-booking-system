import env from './config/env.js';
import { createApp } from './app.js';
import {
  initializeDatabase,
  closeDatabase,
  checkDatabase,
} from './db.js';

let httpServer = null;
let shuttingDown = false;
let started = false;

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));

    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        const enriched = new Error(
          `Port ${port} is already in use. Another process is listening on ::: ${port}. ` +
            'Stop the existing backend instance before starting a new one. ' +
            'PowerShell: Get-NetTCPConnection -LocalPort ' +
            `${port} -ErrorAction SilentlyContinue | Select OwningProcess`,
        );
        enriched.code = 'EADDRINUSE';
        enriched.port = port;
        enriched.cause = error;
        reject(enriched);
        return;
      }
      reject(error);
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  const forceTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);
  forceTimer.unref?.();

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
      console.log('HTTP server closed');
    }
  } catch (error) {
    console.error('Error while closing HTTP server:', error.message || error);
  }

  try {
    await closeDatabase();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error while closing database pool:', error.message || error);
  }

  clearTimeout(forceTimer);
  process.exit(0);
}

function registerSignalHandlers() {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        console.error('Shutdown failed:', error.message || error);
        process.exit(1);
      });
    });
  }

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    if (!httpServer) {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException').finally(() => process.exit(1));
  });
}

export async function stopServer(signal = 'manual') {
  await shutdown(signal);
}

export async function startServer() {
  if (started) {
    throw new Error('startServer() was called more than once in this process.');
  }
  started = true;

  registerSignalHandlers();

  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Port: ${env.PORT}`);
  console.log(`Database host: ${env.DB_HOST}:${env.DB_PORT}`);
  console.log(`Database name: ${env.DB_NAME}`);

  try {
    await initializeDatabase();
    const database = await checkDatabase();
    if (!database.ok) {
      throw new Error(`Database connectivity check failed: ${database.message}`);
    }
    console.log('Database: connected');

    const app = createApp();
    httpServer = await listen(app, env.PORT);

    console.log('Redis: not configured');
    console.log('API: ready');
    console.log(`${env.APP_NAME} backend running on http://localhost:${env.PORT}`);
    console.log('Press Ctrl+C to stop (graceful shutdown).');

    return httpServer;
  } catch (error) {
    console.error('Backend startup failed:', error.message || error);
    try {
      await closeDatabase();
    } catch {
      // ignore cleanup errors during failed startup
    }
    process.exitCode = 1;
    throw error;
  }
}

const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('server.js') ||
    process.argv[1].endsWith('server'));

if (isDirectRun) {
  startServer().catch(() => {
    process.exit(1);
  });
}
