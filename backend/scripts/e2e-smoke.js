import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = 'http://localhost:5006/api';

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function logResult(name, method, path, result) {
  const ok = result.status >= 200 && result.status < 300;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${method} | ${path} | ${result.status} | ${name}`);
  if (!ok) console.log('  ', result.data);
  return ok;
}

const stamp = Date.now();
const email = `e2e_${stamp}@example.com`;
const password = 'Password123!';

let passed = 0;
let failed = 0;

async function check(name, method, path, options, assertFn) {
  const result = await request(method, path, options);
  const ok = logResult(name, method, path, result) && (!assertFn || assertFn(result));
  if (ok) passed += 1;
  else failed += 1;
  return result;
}

async function main() {
  const reg = await check(
    'Registration with phone',
    'POST',
    '/auth/register',
    {
      body: {
        email,
        password,
        name: 'E2E User',
        role: 'user',
        phone: '9876543210',
        phoneCountryCode: '+91',
      },
    },
    (r) => r.data?.user?.phone === '9876543210' && r.data?.user?.phoneCountryCode === '+91',
  );

  const token = reg.data?.token;
  const login = await check('Login', 'POST', '/auth/login', {
    body: { email, password, role: 'user' },
  });
  const userToken = login.data?.token || token;

  await check('Profile GET me', 'GET', '/auth/me', { token: userToken }, (r) => !!r.data?.user?.phone);

  await check(
    'Profile update',
    'PUT',
    '/auth/profile',
    {
      token: userToken,
      body: { name: 'E2E Updated', phone: '1112223333', phoneCountryCode: '+1' },
    },
    (r) => r.data?.user?.name === 'E2E Updated',
  );

  const adminLogin = await request('POST', '/auth/login', {
    body: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, role: 'admin' },
  });
  const adminToken = adminLogin.data?.token;

  if (adminToken) {
    await check('Pricing meta', 'GET', '/pricing-rules/meta', { token: adminToken });
    await check(
      'Save general pricing',
      'PUT',
      '/pricing-rules/general',
      {
        token: adminToken,
        body: {
          baseRate: 25,
          currency: 'USD',
          applyTax: true,
          taxRate: 8.5,
          taxLabel: 'State Sales Tax',
          rules: [],
        },
      },
    );
    await check('Load general pricing', 'GET', '/pricing-rules/general', { token: adminToken });
  } else {
    console.log('SKIP admin pricing tests (missing SEED_ADMIN credentials in env)');
  }

  const resources = await check('List resources', 'GET', '/resources', { token: userToken });
  const resource = resources.data?.resources?.[0];

  if (resource) {
    await check('Pricing for resource', 'GET', `/pricing-rules/resources?resourceId=${resource.id}`, {
      token: userToken,
    });

    const booking = await check(
      'Create booking',
      'POST',
      '/bookings',
      {
        token: userToken,
        body: {
          resource: resource.name,
          resourceId: resource.id,
          date: `2027-06-${String((stamp % 28) + 1).padStart(2, '0')}`,
          time: '10:00',
          startTime: '10:00',
          endTime: '12:00',
          purpose: 'E2E test',
        },
      },
    );

    const code = booking.data?.booking?.id;
    if (code) {
      await check('Booking receipt', 'GET', `/bookings/${code}/receipt`, { token: userToken });
    }
  } else {
    console.log('SKIP booking tests (no resources in database)');
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
