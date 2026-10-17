import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { parseLinePayJson, signature } = await import('./linepay');

describe('linepay helpers', () => {
  it('keeps 19-digit transaction ids exact', () => {
    const parsed = parseLinePayJson('{"returnCode":"0000","info":{"transactionId":2026101712345678901}}');
    expect(parsed.info.transactionId).toBe('2026101712345678901');
  });
  it('signs secret + path + body + nonce with HMAC-SHA256', () => {
    // Reference value computed independently with openssl.
    expect(signature('secret', '/v3/payments/request', '{}', 'n')).toBe(
      'bk8PfXri8j2AXKBFbLsLQVxqyVmyIcQ6c2V+cFK3Dtc='
    );
  });
});
