/**
 * End-to-end User ↔ Admin synchronization tests via the REST API.
 * Run with: node scripts/e2e-sync-test.js
 * Requires backend on http://localhost:5006 and a connected MySQL database.
 */
import env from '../config/env.js';

const API = process.env.E2E_API_URL || `http://127.0.0.1:${env.PORT || 5006}`;
const FETCH_TIMEOUT_MS = 15000;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const USER_EMAIL = process.env.SEED_USER_EMAIL || 'user@local.test';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'ChangeMe123!';

const results = [];

function log(icon, name, detail = '') {
  const line = detail ? `${icon} ${name} — ${detail}` : `${icon} ${name}`;
  console.log(line);
  results.push({ name, ok: icon === 'PASS', detail });
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

async function login(email, password, role) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password, role },
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTest(name, fn) {
  try {
    await fn();
    log('PASS', name);
    return true;
  } catch (error) {
    log('FAIL', name, error.message || String(error));
    return false;
  }
}

async function main() {
  console.log(`\nE2E Sync Tests — ${API}\n${'='.repeat(50)}`);

  const health = await request('/health');
  if (!health.ok) {
    console.error(`Backend not reachable at ${API} (status ${health.status})`);
    process.exit(1);
  }

  const adminAuth = await login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  const userAuth = await login(USER_EMAIL, USER_PASSWORD, 'user');
  const adminToken = adminAuth.token;
  const userToken = userAuth.token;

  let testResourceId = null;
  let testBookingCode = null;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Ensure autoConfirm is off so user bookings start Pending
  await request('/api/settings', {
    method: 'PUT',
    token: adminToken,
    body: {
      systemName: 'Booking Configuration',
      currency: 'USD ($)',
      language: 'English (US)',
      maxHours: 8,
      advanceDays: 30,
      sameDay: true,
      autoConfirm: false,
      emailNotifications: true,
    },
  });

  await runTest('Test 1a — Admin creates resource', async () => {
    const res = await request('/api/resources', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `E2E Sync Room ${Date.now()}`,
        type: 'Conference',
        capacity: 8,
        location: 'Floor 2, Test Wing',
        description: 'E2E sync test resource',
        available: true,
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testResourceId = res.data.resource.id;
    assert(testResourceId, 'Resource id missing');
  });

  await runTest('Test 1b — User sees new resource in browse list', async () => {
    const res = await request('/api/resources', { token: userToken });
    assert(res.ok, `GET /resources failed: ${JSON.stringify(res.data)}`);
    const found = res.data.resources.some((r) => r.id === testResourceId);
    assert(found, 'User cannot see admin-created resource');
  });

  await runTest('Test 2a — User creates booking (Pending)', async () => {
    const resourceRes = await request(`/api/resources/${testResourceId}`, { token: userToken });
    const resource = resourceRes.data.resource;
    const res = await request('/api/bookings', {
      method: 'POST',
      token: userToken,
      body: {
        resource: resource.name,
        resourceId: resource.id,
        date: tomorrow,
        time: '10:00',
        startTime: '10:00',
        endTime: '11:30',
        amount: '45.00',
        purpose: 'E2E sync test',
        notes: 'Automated test booking',
      },
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testBookingCode = res.data.booking.id;
    assert(res.data.booking.status === 'Pending', `Expected Pending, got ${res.data.booking.status}`);
  });

  await runTest('Test 2b — Admin sees new booking + pending stats', async () => {
    const res = await request('/api/bookings', { token: adminToken });
    assert(res.ok, `Admin bookings failed: ${JSON.stringify(res.data)}`);
    const found = res.data.bookings.some((b) => b.id === testBookingCode);
    assert(found, 'Admin cannot see user-created booking');
    assert(res.data.stats.pending >= 1, 'Admin pending stat should be >= 1');
  });

  await runTest('Test 2c — Admin dashboard stats reflect booking', async () => {
    const before = await request('/api/dashboard', { token: adminToken });
    assert(before.ok, 'Admin dashboard failed');
    assert(before.data.stats.totalBookings >= 1, 'totalBookings should be >= 1');
    const recent = before.data.bookings || before.data.recent || [];
    assert(recent.some((b) => b.id === testBookingCode), 'Booking not in admin recent activity');
  });

  await runTest('Test 3a — Admin approves booking', async () => {
    const res = await request(`/api/bookings/${testBookingCode}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'Confirmed' },
    });
    assert(res.ok, `Approve failed: ${JSON.stringify(res.data)}`);
    assert(res.data.booking.status === 'Confirmed', 'Status not Confirmed after approve');
  });

  await runTest('Test 3b — User sees Confirmed status + notification', async () => {
    const bookingsRes = await request('/api/bookings/my', { token: userToken });
    assert(bookingsRes.ok, 'User my bookings failed');
    const booking = bookingsRes.data.bookings.find((b) => b.id === testBookingCode);
    assert(booking, 'User booking not found');
    assert(booking.status === 'Confirmed', `User still sees ${booking.status}`);

    const notifRes = await request('/api/notifications', { token: userToken });
    assert(notifRes.ok, 'Notifications fetch failed');
    const hasConfirm = notifRes.data.notifications.some((n) =>
      String(n.title || '').includes('Confirmed') || String(n.message || '').includes('approved'),
    );
    assert(hasConfirm, 'User did not receive approval notification');
  });

  await runTest('Test 4 — Admin marks resource unavailable, user sees it', async () => {
    const putRes = await request(`/api/resources/${testResourceId}`, {
      method: 'PUT',
      token: adminToken,
      body: { available: false },
    });
    assert(putRes.ok, `Resource update failed: ${JSON.stringify(putRes.data)}`);
    const userRes = await request('/api/resources', { token: userToken });
    const resource = userRes.data.resources.find((r) => r.id === testResourceId);
    assert(resource, 'Resource missing for user');
    assert(resource.available === false, 'User still sees resource as available');
  });

  await runTest('Test 5 — Admin cancels booking, user reflects cancellation', async () => {
    const res = await request(`/api/bookings/${testBookingCode}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'Cancelled' },
    });
    assert(res.ok, `Cancel via status failed: ${JSON.stringify(res.data)}`);

    const userRes = await request('/api/bookings/my', { token: userToken });
    const booking = userRes.data.bookings.find((b) => b.id === testBookingCode);
    assert(booking?.status === 'Cancelled', `User sees ${booking?.status} after admin cancel`);
  });

  await runTest('Test 6 — User creates + cancels booking, admin stats update', async () => {
    const resourceRes = await request(`/api/resources/${testResourceId}`, { token: userToken });
    const resource = resourceRes.data.resource;
    const createRes = await request('/api/bookings', {
      method: 'POST',
      token: userToken,
      body: {
        resource: resource.name,
        resourceId: resource.id,
        date: tomorrow,
        time: '14:00',
        startTime: '14:00',
        endTime: '15:00',
        amount: '30.00',
      },
    });
    assert(createRes.status === 201, 'Second booking create failed');
    const code = createRes.data.booking.id;

    const adminBefore = await request('/api/bookings', { token: adminToken });
    const pendingBefore = adminBefore.data.stats.pending;

    const delRes = await request(`/api/bookings/${code}`, { method: 'DELETE', token: userToken });
    assert(delRes.ok, `User cancel failed: ${JSON.stringify(delRes.data)}`);

    const adminAfter = await request('/api/bookings', { token: adminToken });
    const gone = !adminAfter.data.bookings.some((b) => b.id === code);
    assert(gone, 'Cancelled booking still listed for admin');
    assert(adminAfter.data.stats.pending <= pendingBefore, 'Pending count did not decrease after user cancel');
  });

  await runTest('Cleanup — delete test resource', async () => {
    if (!testResourceId) return;
    const res = await request(`/api/resources/${testResourceId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(res.ok, `Cleanup delete failed: ${JSON.stringify(res.data)}`);
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('E2E runner error:', error.message || error);
  process.exit(1);
});
