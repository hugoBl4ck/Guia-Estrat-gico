import { describe, expect, it } from 'vitest';
import { validateAuthCredentials } from './authValidation';

describe('validateAuthCredentials', () => {
  it('rejects signup without a password', () => {
    expect(validateAuthCredentials('', 'signup')).toBe('Informe uma senha.');
  });

  it('rejects a weak signup password', () => {
    expect(validateAuthCredentials('1234567', 'signup')).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('accepts an existing password length during login', () => {
    expect(validateAuthCredentials('1234567', 'login')).toBeNull();
  });

  it('rejects login without a password', () => {
    expect(validateAuthCredentials('', 'login')).toBe('Informe uma senha.');
  });
});