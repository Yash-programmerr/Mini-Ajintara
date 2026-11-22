let memoryToken = null;

export function readToken() {
  try {
    return localStorage.getItem('token') ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function writeToken(token) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  } catch {
    // Storage can be unavailable in privacy modes. Keep the session in this tab.
  }
}
