const base = 'http://localhost:5006/api/auth';

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`POST ${path} ->`, res.status, data.user ? `user=${data.user.email} role=${data.user.role} token=${!!data.token}` : JSON.stringify(data));
  return { res, data };
}

(async () => {
  // Test admin login
  await post('/login', { email: 'admin@example.com', password: 'Admin@123', role: 'admin' });
  // Test user login
  await post('/login', { email: 'user@example.com', password: 'User@123', role: 'user' });
  // Test admin registration (unique email)
  const email = `admintest${Date.now()}@example.com`;
  await post('/register', { email, password: 'Admin@123', name: 'Test Admin', role: 'admin' });
})();
