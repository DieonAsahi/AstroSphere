import { describe, expect, it, vi } from 'vitest';
import { initMonitoring, reportError, scrubPii } from './monitoring';

describe('Monitoring & Privacy-Preserving Error Reporting', () => {
  it('scrubs personal email addresses, tokens, and sensitive query params', () => {
    const raw =
      'User budi.santoso@sekolah.sch.id encountered error with token=xyz987654321 and ?token=secret123';
    const scrubbed = scrubPii(raw);

    expect(scrubbed).not.toContain('budi.santoso@sekolah.sch.id');
    expect(scrubbed).not.toContain('xyz987654321');
    expect(scrubbed).not.toContain('secret123');
    expect(scrubbed).toContain('[EMAIL_DISAMARKAN]');
    expect(scrubbed).toContain('[TOKEN_DISAMARKAN]');
  });

  it('generates a scrubbed error payload without leaking personal info', () => {
    const error = new Error('Gagal memuat profil untuk siswa@sekolah.id');
    const payload = reportError(error, {
      detail: 'Request token=abc123def gagal',
    });

    expect(payload.name).toBe('Error');
    expect(payload.message).toContain('[EMAIL_DISAMARKAN]');
    expect(payload.message).not.toContain('siswa@sekolah.id');
    expect(payload.context).toBeDefined();
    expect(JSON.stringify(payload.context)).not.toContain('abc123def');
    expect(payload.timestamp).toBeDefined();
  });

  it('initializes window event listeners cleanly', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    initMonitoring();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });
});
