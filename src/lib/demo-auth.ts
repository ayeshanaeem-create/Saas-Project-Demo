// HTTP Basic auth check for a password-protected deployment (see src/proxy.ts).
// Pure, so it can run in the proxy and be unit-tested.

/** True when the Authorization header carries `password` (any username). */
export function isAuthorized(authorization: string | null, password: string): boolean {
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    const bytes = Uint8Array.from(atob(authorization.slice(6).trim()), (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  return constantTimeEqual(decoded.slice(separator + 1), password);
}

/** Compares without stopping at the first difference, so timing doesn't leak the password. */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
