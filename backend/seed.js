import './config/env.js';
import { seedDatabase, closeDatabase } from './db.js';

const args = new Set(process.argv.slice(2));
const reset = args.has('--reset');

try {
  const result = await seedDatabase({ reset });
  console.log(result.message);
  if (result.seeded) {
    console.log(`Inserted ${result.inserted} records.`);
  }
} catch (error) {
  console.error('Seed failed:', error.message || error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
