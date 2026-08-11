import env from '../config/env.js';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

const [ver] = await conn.query('SELECT VERSION() AS v');
const [tables] = await conn.query('SHOW TABLES');
const [users] = await conn.query('SELECT id, email, name, role FROM users');
const [settings] = await conn.query('SELECT id, CAST(data AS CHAR) AS data FROM settings');
const [pricing] = await conn.query('SELECT id, context, CAST(data AS CHAR) AS data FROM pricing_rules');

console.log('Server:', ver[0].v);
console.log('Host:', `${env.DB_HOST}:${env.DB_PORT}`);
console.log('Database:', env.DB_NAME);
console.log('User:', env.DB_USER);
console.log(
  'Tables:',
  tables.map((row) => Object.values(row)[0]).join(', '),
);
console.log('Users:');
console.table(users);
console.log('Settings:', settings);
console.log('Pricing:', pricing);

await conn.end();
