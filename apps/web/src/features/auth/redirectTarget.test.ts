import { describe, expect, it } from 'vitest';

import { redirectTarget } from './redirectTarget';

describe('redirectTarget', () => {
  it('restores the deep link RequireAuth bounced from, including its query string', () => {
    const state = { from: { pathname: '/employees', search: '?department=eng&offset=50' } };
    expect(redirectTarget(state)).toBe('/employees?department=eng&offset=50');
  });

  it('restores a pathname with no query string', () => {
    expect(redirectTarget({ from: { pathname: '/employees', search: '' } })).toBe('/employees');
  });

  it('drops the hash — only pathname and search are restored', () => {
    const state = { from: { pathname: '/employees', search: '?q=ann', hash: '#top' } };
    expect(redirectTarget(state)).toBe('/employees?q=ann');
  });

  it('falls back to /employees when there is no state (login opened directly)', () => {
    expect(redirectTarget(null)).toBe('/employees');
    expect(redirectTarget(undefined)).toBe('/employees');
    expect(redirectTarget({})).toBe('/employees');
  });

  it('falls back when state.from is malformed', () => {
    expect(redirectTarget({ from: '/employees' })).toBe('/employees');
    expect(redirectTarget({ from: { pathname: 42 } })).toBe('/employees');
  });

  it('rejects a protocol-relative path that would leave the app', () => {
    expect(redirectTarget({ from: { pathname: '//evil.example', search: '' } })).toBe(
      '/employees',
    );
  });

  it('rejects a relative path', () => {
    expect(redirectTarget({ from: { pathname: 'employees', search: '' } })).toBe('/employees');
  });

  it('never redirects back to /login', () => {
    expect(redirectTarget({ from: { pathname: '/login', search: '' } })).toBe('/employees');
  });
});
