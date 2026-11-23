import { setTimeout as wait } from 'node:timers/promises';

class CheckFailure extends Error {}

function check(condition, message) {
  if (!condition) throw new CheckFailure(message);
}

function readUrl(name) {
  const value = process.env[name];
  check(value && URL.canParse(value), `Set ${name} to an absolute HTTP or HTTPS URL.`);
  const url = new URL(value);
  check(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash,
    `Use an HTTP or HTTPS URL without credentials, query or fragment for ${name}.`);
  return url;
}

async function step(number, label, fn) {
  try {
    const value = await fn();
    console.log(`PASS ${number}. ${label}`);
    return value;
  } catch (error) {
    // Response bodies and fetch errors can contain credentials or tokens.
    const message = error instanceof CheckFailure ? error.message : 'Request failed or timed out.';
    console.error(`FAIL ${number}. ${label} (${message})`);
    process.exitCode = 1;
  }
}

async function smoke() {
  const api = readUrl('API_URL');
  const origin = process.env.FRONTEND_URL;
  readUrl('FRONTEND_URL');
  check(/^https?:\/\/[^\s/@?#*\\]+$/i.test(origin), 'Set FRONTEND_URL to one exact origin without a trailing slash.');
  const password = process.env.SMOKE_PASSWORD;
  check(password, 'Set SMOKE_PASSWORD to the existing demo accounts’ password.');
  const path = api.pathname.replace(/\/+$/, '');
  api.pathname = path.endsWith('/api') ? path + '/' : path + '/api/';

  async function request(route, options = {}, timeout = 10000) {
    const response = await fetch(new URL(route, api), {
      ...options, redirect: 'manual', signal: AbortSignal.timeout(timeout),
    });
    const body = await response.text();
    let json;
    try { json = JSON.parse(body); } catch { /* Preflights have an empty body. */ }
    return { status: response.status, headers: response.headers, json };
  }

  function status(result, expected) {
    check(result.status === expected, `Expected HTTP ${expected}, received HTTP ${result.status}.`);
  }

  const health = await step(1, 'API health', async () => {
    const deadline = Date.now() + 90000;
    let last = 'The request timed out or could not reach the API.';
    while (Date.now() < deadline) {
      try {
        const result = await request('health', {}, Math.max(1, Math.min(10000, deadline - Date.now())));
        if (result.status === 200 && result.json?.status === 'ok') return result;
        last = `Received HTTP ${result.status} without a healthy response.`;
      } catch { /* A sleeping service may close the first connection. */ }
      const delay = Math.min(3000, deadline - Date.now());
      if (delay > 0) {
        console.log(`Waiting ${Math.ceil(delay / 1000)}s for API health before retrying.`);
        await wait(delay);
      }
    }
    throw new CheckFailure('Health deadline reached. ' + last);
  });

  await step(2, 'Unknown route returns the API error envelope', async () => {
    const result = await request('smoke-missing-route');
    status(result, 404);
    const error = result.json?.error;
    check(Object.keys(result.json ?? {}).length === 1 && typeof error?.code === 'string' && error.code &&
      typeof error.message === 'string' && error.message &&
      Object.keys(error).every((key) => ['code', 'message', 'details'].includes(key)) &&
      (error.details === undefined || Array.isArray(error.details)),
      'Expected a JSON error with a code and message.');
  });

  await step(3, 'Login rejects a JSON payload over 10 KB', async () => {
    status(await request('auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(11 * 1024) }),
    }), 413);
  });

  await step(4, 'CORS distinguishes the frontend and an unlisted origin', async () => {
    const preflight = (origin) => request('auth/login', {
      method: 'OPTIONS', headers: {
        Origin: origin, 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
      },
    });
    const allowed = await preflight(origin);
    check(allowed.status >= 200 && allowed.status < 300 && allowed.headers.get('access-control-allow-origin') === origin,
      'The frontend preflight must succeed and return its exact origin.');
    const list = (header) => (allowed.headers.get(header) ?? '').toLowerCase().split(',').map((s) => s.trim());
    check(list('access-control-allow-headers').includes('authorization'), 'Preflight must allow Authorization.');
    const methods = list('access-control-allow-methods');
    check(['get', 'post', 'put', 'patch', 'delete'].every((method) => methods.includes(method)),
      'Preflight is missing a required method.');
    const blocked = await preflight('https://evil.example');
    check(!blocked.headers.has('access-control-allow-origin'), 'The unlisted origin received an allowance.');
  });

  let guestToken;
  await step(5, 'Guest and partner logins return the expected roles from /auth/me', async () => {
    for (const [role, email] of [['guest', 'guest@ajintara.test'], ['partner', 'partner1@ajintara.test']]) {
      const login = await request('auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      status(login, 200);
      const token = login.json?.token;
      check(typeof token === 'string' && token.length > 0, `Missing ${role} session token.`);
      const me = await request('auth/me', { headers: { Authorization: `Bearer ${token}` } });
      status(me, 200);
      check(me.json?.user?.role === role && me.json.user.email === email, `Unexpected ${role} account identity.`);
      if (role === 'guest') guestToken = token;
    }
  });

  await step(6, 'Partner routes enforce authentication and role', async () => {
    status(await request('partner/properties'), 401);
    check(guestToken, 'The guest session is unavailable.');
    status(await request('partner/properties', { headers: { Authorization: `Bearer ${guestToken}` } }), 403);
  });

  await step(7, 'Health response carries the expected security headers', async () => {
    check(health, 'The health response is unavailable.');
    check(health.headers.has('x-content-type-options'), 'Missing X-Content-Type-Options.');
    check(!health.headers.has('x-powered-by'), 'X-Powered-By is present.');
  });
}

try {
  await smoke();
} catch (error) {
  console.error('FAIL smoke configuration. ' + (error instanceof CheckFailure ? error.message : 'Invalid settings.'));
  process.exitCode = 1;
}
