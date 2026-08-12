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

const results = [];

function record(name, method, path, result, ok) {
  results.push({ name, method, path, status: result.status, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${method} | ${path} | ${result.status} | ${name}`);
  if (!ok) console.log('   ', result.data);
}

async function check(name, method, path, options = {}, assertFn) {
  const result = await request(method, path, options);
  const ok = result.status >= 200 && result.status < 300 && (!assertFn || assertFn(result));
  record(name, method, path, result, ok);
  return result;
}

async function main() {
  const stamp = Date.now();
  const email = `validate_${stamp}@example.com`;
  const password = 'Password123!';

  const reg = await check(
    'Register with phone',
    'POST',
    '/auth/register',
    {
      body: {
        email,
        password,
        name: 'Validate User',
        role: 'user',
        phone: '9876543210',
        phoneCountryCode: '+91',
      },
    },
    (r) => r.data?.user?.phone === '9876543210' && r.data?.user?.phoneCountryCode === '+91',
  );

  const userToken = reg.data?.token;

  await check('Login user', 'POST', '/auth/login', {
    body: { email, password, role: 'user' },
  }, (r) => !!r.data?.token);

  const loginNoRole = await check('Login without role', 'POST', '/auth/login', {
    body: { email, password },
  }, (r) => r.data?.user?.role === 'user' && !!r.data?.token);
  record(
    'Login without role returns actual role',
    'POST',
    '/auth/login',
    loginNoRole,
    loginNoRole.data?.user?.role === 'user',
  );

  const wrongRole = await request('POST', '/auth/login', {
    body: { email, password, role: 'admin' },
  });
  record('Login wrong role fails', 'POST', '/auth/login', wrongRole, wrongRole.status === 401);

  await check('Profile GET /me', 'GET', '/auth/me', { token: userToken }, (r) => !!r.data?.user?.phone);

  await check(
    'Profile update',
    'PUT',
    '/auth/profile',
    {
      token: userToken,
      body: { name: 'Validate Updated', phone: '1112223333', phoneCountryCode: '+1' },
    },
    (r) => r.data?.user?.name === 'Validate Updated' && r.data?.user?.phone === '1112223333',
  );

  const adminLogin = await request('POST', '/auth/login', {
    body: {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@local.test',
      password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'admin',
    },
  });
  const adminToken = adminLogin.data?.token;
  record('Admin login', 'POST', '/auth/login', adminLogin, !!adminToken);

  if (adminToken) {
    await check('Pricing meta', 'GET', '/pricing-rules/meta', { token: adminToken });

    await check(
      'Save general pricing with discount rule',
      'PUT',
      '/pricing-rules/general',
      {
        token: adminToken,
        body: {
          baseRate: 99,
          applyTax: false,
          taxRate: 0,
          taxLabel: 'Tax',
          minimumDuration: '1 Hour',
          rules: [
            {
              name: 'Early Bird',
              condition: 'Every booking',
              modifier: '-10%',
              modifierType: 'percent',
              value: 10,
              direction: 'discount',
              conditionType: 'custom',
              active: true,
            },
          ],
        },
      },
    );

    const pricingLoad = await check('Load general pricing', 'GET', '/pricing-rules/general', { token: adminToken });
    const savedRules = pricingLoad.data?.pricing?.general?.rules || [];
    record(
      'Pricing rules persisted',
      'GET',
      '/pricing-rules/general',
      pricingLoad,
      savedRules.some((rule) => rule.name === 'Early Bird'),
    );

    await check(
      'Set minimum duration to 2 hours',
      'PUT',
      '/pricing-rules/general',
      {
        token: adminToken,
        body: {
          ...(pricingLoad.data?.pricing?.general || {}),
          minimumDuration: '2 Hours',
        },
      },
    );
  }

  const resources = await check('Browse rooms list', 'GET', '/resources', { token: userToken });
  const resource = resources.data?.resources?.[0];

  if (resource) {
    await check('Resource pricing snapshot', 'GET', `/pricing-rules/resources?resourceId=${resource.id}`, {
      token: userToken,
    });

    const quote = await check(
      'Pricing calculate',
      'POST',
      '/pricing-rules/calculate',
      {
        token: userToken,
        body: {
          resourceId: resource.id,
          date: `2027-07-${String((stamp % 28) + 1).padStart(2, '0')}`,
          startTime: '10:00',
          endTime: '11:00',
        },
      },
      (r) => Number(r.data?.breakdown?.total) > 0,
    );

    const discountItem = quote.data?.breakdown?.lineItems?.find((item) => item.description === 'Early Bird');
    record(
      'Discount rule reduces price',
      'POST',
      '/pricing-rules/calculate',
      quote,
      discountItem && discountItem.amount < 0,
    );

    if (adminToken) {
      const tooShort = await request('POST', '/bookings', {
        token: userToken,
        body: {
          resource: resource.name,
          resourceId: resource.id,
          date: `2027-09-${String((stamp % 28) + 1).padStart(2, '0')}`,
          time: '10:00',
          startTime: '10:00',
          endTime: '11:00',
          purpose: 'Below minimum duration',
        },
      });
      record(
        'Booking below minimum duration rejected',
        'POST',
        '/bookings',
        tooShort,
        tooShort.status === 400 && String(tooShort.data?.message || '').includes('at least'),
      );
    }

    const booking = await check(
      'Create booking',
      'POST',
      '/bookings',
      {
        token: userToken,
        body: {
          resource: resource.name,
          resourceId: resource.id,
          date: `2028-${String((stamp % 11) + 1).padStart(2, '0')}-${String((stamp % 25) + 1).padStart(2, '0')}`,
          time: '10:00',
          startTime: '10:00',
          endTime: '12:00',
          purpose: 'Validation test',
        },
      },
      (r) => !!r.data?.booking?.id,
    );

    const code = booking.data?.booking?.id;
    if (code) {
      const receipt = await check('Booking receipt owner', 'GET', `/bookings/${code}/receipt`, { token: userToken }, (r) => {
        return !!r.data?.receipt?.breakdown?.lineItems?.length && !!r.data?.receipt?.receiptId?.startsWith('RCT-');
      });

      record(
        'Receipt uses pricing snapshot',
        'GET',
        `/bookings/${code}/receipt`,
        receipt,
        receipt.data?.receipt?.breakdown?.total !== undefined &&
          Number(receipt.data?.receipt?.breakdown?.total) === Number(booking.data?.pricing?.total),
      );

      if (adminToken) {
        await check('Booking receipt admin', 'GET', `/bookings/${code}/receipt`, { token: adminToken });
      }

      const otherUser = await request('POST', '/auth/register', {
        body: {
          email: `other_${stamp}@example.com`,
          password,
          name: 'Other User',
          role: 'user',
          phone: '5555555555',
          phoneCountryCode: '+1',
        },
      });
      const otherToken = otherUser.data?.token;
      const denied = await request('GET', `/bookings/${code}/receipt`, { token: otherToken });
      record('Receipt denied for other user', 'GET', `/bookings/${code}/receipt`, denied, denied.status === 404);
    }
  } else {
    console.log('SKIP resource/booking tests (no resources in database)');
  }

  if (adminToken) {
    const meta = await check('Pricing meta dynamic contexts', 'GET', '/pricing-rules/meta', { token: adminToken });
    const contexts = meta.data?.contexts || [];
    const resourcesA = await request('GET', '/resources', { token: userToken });
    const allResources = resourcesA.data?.resources || [];
    let typedResource = null;
    let ctx = null;
    for (const resource of allResources) {
      const match = contexts.find((c) => c.label === resource.type && c.value !== 'general');
      if (match) {
        typedResource = resource;
        ctx = match;
        break;
      }
    }
    if (ctx && typedResource) {
      await check(
        'Reset general rules for isolated context pricing test',
        'PUT',
        '/pricing-rules/general',
        {
          token: adminToken,
          body: {
            baseRate: 99,
            applyTax: false,
            taxRate: 0,
            taxLabel: 'Tax',
            minimumDuration: '1 Hour',
            rules: [],
          },
        },
      );

      const rateA = 80;
      const rateB = 120;
      const testDate = `2027-11-${String((stamp % 28) + 1).padStart(2, '0')}`;

      await check(
        'Save booking-system pricing rate A',
        'PUT',
        `/pricing-rules/${ctx.value}`,
        {
          token: adminToken,
          body: {
            hourlyRate: rateA,
            freeFirstHour: false,
            peakStart: '',
            peakEnd: '',
            peakDays: 'Mon - Fri',
            peakMultiplier: 1,
            roleDiscounts: [],
            rules: [],
          },
        },
      );

      const persistA = await check('Persist rate A in database', 'GET', `/pricing-rules/${ctx.value}`, { token: adminToken });
      record(
        'Context hourly rate A persisted',
        'GET',
        `/pricing-rules/${ctx.value}`,
        persistA,
        Number(persistA.data?.pricing?.[ctx.value]?.hourlyRate) === rateA,
      );

      if (typedResource) {
        const quoteA = await request('POST', '/pricing-rules/calculate', {
          token: userToken,
          body: {
            resourceId: typedResource.id,
            resourceType: typedResource.type,
            date: testDate,
            startTime: '10:00',
            endTime: '11:00',
          },
        });
        const totalA = Number(quoteA.data?.breakdown?.total);

        await check(
          'Save booking-system pricing rate B',
          'PUT',
          `/pricing-rules/${ctx.value}`,
          {
            token: adminToken,
            body: {
              hourlyRate: rateB,
              freeFirstHour: false,
              peakStart: '',
              peakEnd: '',
              peakDays: 'Mon - Fri',
              peakMultiplier: 1,
              roleDiscounts: [],
              rules: [],
            },
          },
        );

        const quoteB = await request('POST', '/pricing-rules/calculate', {
          token: userToken,
          body: {
            resourceId: typedResource.id,
            resourceType: typedResource.type,
            date: testDate,
            startTime: '10:00',
            endTime: '11:00',
          },
        });
        const totalB = Number(quoteB.data?.breakdown?.total);

        record(
          'Updated pricing changes booking calculation',
          'POST',
          '/pricing-rules/calculate',
          quoteB,
          totalB > totalA && totalB === rateB,
        );

        const bookingB = await request('POST', '/bookings', {
          token: userToken,
          body: {
            resource: typedResource.name,
            resourceId: typedResource.id,
            date: `2027-12-${String((stamp % 28) + 1).padStart(2, '0')}`,
            time: '10:00',
            startTime: '10:00',
            endTime: '11:00',
            purpose: 'Dynamic pricing test',
          },
        });
        const bookingAmount = parseFloat(String(bookingB.data?.booking?.amount || '').replace(/[^\d.-]/g, ''));
        const pricingTotal = Number(bookingB.data?.pricing?.total);
        record(
          'Booking stores backend-calculated amount',
          'POST',
          '/bookings',
          bookingB,
          bookingB.status === 201 && bookingAmount === rateB && pricingTotal === rateB,
        );

        const dynamicCode = bookingB.data?.booking?.id;
        if (dynamicCode) {
          const receiptRes = await request('GET', `/bookings/${dynamicCode}/receipt`, { token: userToken });
          const receiptTotal = Number(receiptRes.data?.receipt?.breakdown?.total);
          record(
            'Receipt matches booking amount',
            'GET',
            `/bookings/${dynamicCode}/receipt`,
            receiptRes,
            receiptRes.status === 200 && receiptTotal === rateB,
          );
        }
      }
    }

    const forbidden = await request('PUT', '/pricing-rules/general', {
      token: userToken,
      body: { baseRate: 1 },
    });
    record('User cannot modify pricing', 'PUT', '/pricing-rules/general', forbidden, forbidden.status === 403);
  }

  const passed = results.filter((item) => item.ok).length;
  const failed = results.filter((item) => !item.ok).length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
