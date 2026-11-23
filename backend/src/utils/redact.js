export function redact(text, env = process.env) {
  const secrets = [env.MONGO_URI, env.ADMIN_PASSWORD, env.SEED_PASSWORD, env.JWT_SECRET];
  const login = env.MONGO_URI?.match(/^mongodb(?:\+srv)?:\/\/([^/\s@]+)@/i)?.[1];
  if (login?.includes(':')) {
    const password = login.slice(login.indexOf(':') + 1);
    secrets.push(password);
    try { secrets.push(decodeURIComponent(password)); } catch { /* A malformed URI may still reach diagnostics. */ }
  }
  let safe = env.MONGO_URI ? String(text).replaceAll(env.MONGO_URI, '***') : String(text);
  safe = safe.replace(/(mongodb(?:\+srv)?:\/\/)[^/\s@]+@/gi, '$1***@');
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
    safe = safe.replaceAll(secret, '***');
  }
  return safe;
}

export function formatScriptError(error, env = process.env) {
  const message = error instanceof Error ? error.name + ': ' + error.message : 'Error: ' + String(error);
  return redact(env.DEBUG_SEED === '1' && error?.stack ? error.stack : message, env);
}
