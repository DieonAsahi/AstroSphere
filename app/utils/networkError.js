// Utilitas Deteksi Koneksi Offline & Pesan Jaringan Ramah (Publik & Admin)
import { ref } from 'vue';

export const OFFLINE_PUBLIC_NOTICE = 'Koneksi internet terputus. Progres disimpan lokal dan akan disinkronkan saat kembali online.';
export const OFFLINE_ADMIN_NOTICE = 'Koneksi internet terputus. Saat ini halaman Admin belum dapat diakses. Periksa koneksi Anda lalu coba lagi.';
export const OFFLINE_ACTION_NOTICE = 'Koneksi internet terputus. Fitur ini memerlukan koneksi internet.';
export const GENERIC_PUBLIC_ERROR = 'Saat ini permintaan belum dapat diproses. Silakan coba beberapa saat lagi.';
export const GENERIC_ADMIN_ERROR = 'Terjadi kendala saat menghubungi server. Silakan coba beberapa saat lagi.';

export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function isOfflineOrNetworkError(err) {
  if (isBrowserOffline()) return true;
  if (!err) return false;

  const name = typeof err === 'object' ? String(err.name || '').toLowerCase() : '';
  const code = typeof err === 'object' ? String(err.code || '').toLowerCase() : '';
  const status = typeof err === 'object' && Number.isFinite(err.status) ? err.status : null;
  const rawMsg = typeof err === 'string'
    ? err
    : (typeof err === 'object' ? String(err.message || err.details || '') : String(err));
  const msg = rawMsg.toLowerCase();

  if (status === 0) return true;
  if (name.includes('authretryablefetcherror') || name.includes('networkerror')) return true;
  if (code === 'network_error' || code === 'etimedout' || code === 'econnrefused' || code === 'enotfound') return true;

  return (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network_changed') ||
    msg.includes('net::err_') ||
    msg.includes('offline') ||
    msg.includes('unable to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound')
  );
}

const networkOfflineRef = ref(isBrowserOffline());
let listenersAttached = false;

function syncNetworkFlag() {
  networkOfflineRef.value = isBrowserOffline();
}

export function attachNetworkListeners() {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;
  window.addEventListener('online', syncNetworkFlag);
  window.addEventListener('offline', syncNetworkFlag);
}

export function useNetworkStatus() {
  attachNetworkListeners();
  return {
    isOffline: networkOfflineRef,
    refreshStatus: syncNetworkFlag,
  };
}
