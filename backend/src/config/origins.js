function parseOrigin(value) {
  // WHATWG URL normalizes paths, credentials and backslashes that are invalid
  // in an Origin header. Reject them before parsing the host and port.
  if (!/^https?:\/\/[^\s/@?#*\\]+$/i.test(value)) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopback(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' ||
    host === '0.0.0.0' || host.startsWith('127.') && /^\d+(\.\d+){3}$/.test(host);
}

export function frontendOrigins(value, production) {
  const origins = value.split(',').map((entry) => entry.trim());
  const urls = origins.map(parseOrigin);
  if (urls.some((url) => !url)) {
    throw new Error('Enter comma-separated HTTP(S) origins without paths, trailing slashes, credentials or wildcards');
  }
  if (production && urls.some((url) => url.protocol !== 'https:' || isLoopback(url.hostname))) {
    throw new Error('Production requires HTTPS origins outside localhost and loopback addresses');
  }
  return [...new Set(origins)];
}
