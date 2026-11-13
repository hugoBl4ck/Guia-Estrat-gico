import { describe, it, expect } from 'vitest';
import {
  MAX_RECEIPT_SIZE_BYTES,
  buildUserReceiptPath,
  validateReceiptUpload,
} from './supabaseClient';

describe('validateReceiptUpload', () => {
  it('accepts valid image and PDF receipts within size limit', () => {
    expect(validateReceiptUpload('image/jpeg', 1024 * 500, 'nota.jpg')).toEqual({
      valid: true,
      ext: 'jpg',
    });
    expect(validateReceiptUpload('image/webp', 1024 * 200, 'comprovante.webp')).toEqual({
      valid: true,
      ext: 'webp',
    });
    expect(validateReceiptUpload('application/pdf', 1024 * 900, 'fatura.pdf')).toEqual({
      valid: true,
      ext: 'pdf',
    });
  });

  it('rejects oversized, empty, or disallowed file types/extensions', () => {
    expect(validateReceiptUpload('image/jpeg', 0).valid).toBe(false);
    expect(validateReceiptUpload('image/jpeg', MAX_RECEIPT_SIZE_BYTES + 1).valid).toBe(false);
    expect(validateReceiptUpload('application/x-msdownload', 1000, 'malware.exe').valid).toBe(false);
    expect(validateReceiptUpload('image/svg+xml', 1000, 'script.svg').valid).toBe(false);
    expect(validateReceiptUpload('image/png', 1000, 'fake.html').valid).toBe(false);
  });
});

describe('buildUserReceiptPath', () => {
  it('builds a strict userId/fileName path and rejects traversal attempts', () => {
    expect(buildUserReceiptPath('user-123', 'exp-1.jpg')).toBe('user-123/exp-1.jpg');
    expect(buildUserReceiptPath('../other', 'exp-1.jpg')).toBeNull();
    expect(buildUserReceiptPath('user-123', '../exp-1.jpg')).toBeNull();
    expect(buildUserReceiptPath('user/123', 'exp-1.jpg')).toBeNull();
    expect(buildUserReceiptPath('', 'exp-1.jpg')).toBeNull();
  });
});

