import './config/env.js';
import { seedDatabase } from './db.js';

const args = new Set(process.argv.slice(2));
const reset = args.has('--reset');

const result = await seedDatabase({ reset });
console.log(result.message);
if (result.seeded) {
  console.log(`Inserted ${result.inserted} records.`);
}
