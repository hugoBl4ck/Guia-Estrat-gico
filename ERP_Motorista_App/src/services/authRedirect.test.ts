import { describe, expect, it } from 'vitest';
import { getAuthRedirectUrl } from './authRedirect';

describe('getAuthRedirectUrl', () => {
  it('prefers an environment URL when configured', () => {
    expect(
      getAuthRedirectUrl({
        envUrl: 'https://app-girocerto.vercel.app',
        currentOrigin: 'http://localhost:3000',
      })
    ).toBe('https://app-girocerto.vercel.app');
  });

  it('uses the current production origin when it is not localhost', () => {
    expect(
      getAuthRedirectUrl({
        currentOrigin: 'https://app-girocerto.vercel.app',
      })
    ).toBe('https://app-girocerto.vercel.app');
  });

  it('falls back to the production domain when the current origin is localhost', () => {
    expect(
      getAuthRedirectUrl({
        currentOrigin: 'http://localhost:3000',
      })
    ).toBe('https://app-girocerto.vercel.app');
  });
});
