<script setup>
// Halaman Manajemen Pengguna (/admin/users) — Lihat Akun Penjelajah, Nonaktifkan/Aktifkan, & Hapus Permanen
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError, downloadSafeCsv } from '~/utils/adminAuth.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const SHIP_LABELS = {
  astra: 'Astra Scout',
  orion: 'Orion Glider',
  nova: 'Nova Voyager',
};

const loading = ref(true);
const refreshing = ref(false);
const acting = ref(false);
const error = ref('');
const notification = ref(null);

const users = ref([]);
const currentAdminId = ref('');
const adminUserIds = ref(new Set());
const adminEmails = ref(new Set());
const selectedStatus = ref('all');   // 'all' | 'active' | 'banned'
const selectedProvider = ref('all'); // 'all' | 'google' | 'username'
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

// Modals
const detailUser = ref(null);
const statusModal = ref(null);       // { user, nextActive, reason }
const deletingUser = ref(null);

const totalUsers = computed(() => users.value.length);
const activeUsersCount = computed(() => users.value.filter((u) => u.is_active !== false).length);
const disabledUsersCount = computed(() => users.value.filter((u) => u.is_active === false).length);
const totalStarsSum = computed(() => users.value.reduce((sum, u) => sum + (Number(u.points) || 0), 0));

async function loadUsers() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const [playersRes, authUserRes, adminListRes] = await Promise.all([
      client.rpc('admin_list_players'),
      client.auth.getUser(),
      client.from('admin_users').select('user_id, email'),
    ]);
    if (playersRes.error) throw playersRes.error;
    users.value = Array.isArray(playersRes.data) ? playersRes.data : [];

    currentAdminId.value = authUserRes?.data?.user?.id || '';
    const idSet = new Set();
    const emailSet = new Set();
    if (!adminListRes.error && Array.isArray(adminListRes.data)) {
      for (const a of adminListRes.data) {
        if (a.user_id) idSet.add(a.user_id);
        if (a.email) emailSet.add(String(a.email).trim().toLowerCase());
      }
    }
    adminUserIds.value = idSet;
    adminEmails.value = emailSet;
  } catch (err) {
    error.value = formatSupabaseError(
      err,
      'Tidak bisa memuat daftar penjelajah. Silakan coba beberapa saat lagi.'
    );
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadUsers();
}

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const isActive = u.is_active !== false;
    if (selectedStatus.value === 'active' && !isActive) return false;
    if (selectedStatus.value === 'banned' && isActive) return false;

    const provider = u.auth_provider === 'google' ? 'google' : 'username';
    if (selectedProvider.value !== 'all' && provider !== selectedProvider.value) return false;

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      return (
        u.display_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.astro_id?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.banned_reason?.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage) || 1);
const paginatedUsers = computed(() => {
  const safePage = Math.min(currentPage.value, totalPages.value);
  const start = (safePage - 1) * itemsPerPage;
  return filteredUsers.value.slice(start, start + itemsPerPage);
});

function resetFilters() {
  selectedStatus.value = 'all';
  selectedProvider.value = 'all';
  searchQuery.value = '';
  currentPage.value = 1;
}

function displayNameOf(u) {
  return u?.display_name || u?.username || 'Penjelajah';
}

function initialsOf(u) {
  const n = displayNameOf(u).trim();
  return n ? n.slice(0, 2).toUpperCase() : 'AS';
}

function shipLabel(id) {
  return SHIP_LABELS[id] || id || 'Astra Scout';
}

function ownedShipList(u) {
  return Array.isArray(u?.owned_ships) && u.owned_ships.length ? u.owned_ships : ['astra'];
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isProtectedAdminRow(u) {
  if (!u) return false;
  if (currentAdminId.value && u.user_id === currentAdminId.value) return true;
  if (adminUserIds.value.has(u.user_id)) return true;
  const email = String(u.email || '').trim().toLowerCase();
  if (email && adminEmails.value.has(email)) return true;
  return false;
}

function openStatusModal(u, nextActive) {
  if (isProtectedAdminRow(u)) {
    showNotification('error', 'Akun sendiri atau administrator tidak dapat dinonaktifkan melalui manajemen pengguna.');
    return;
  }
  statusModal.value = {
    user: u,
    nextActive,
    reason: nextActive ? '' : (u.banned_reason || ''),
  };
}

function openDeleteModal(u) {
  if (isProtectedAdminRow(u)) {
    showNotification('error', 'Akun sendiri atau administrator tidak dapat dihapus melalui manajemen pengguna.');
    return;
  }
  deletingUser.value = u;
}

async function confirmStatusChange() {
  if (!statusModal.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  const { user, nextActive, reason } = statusModal.value;
  acting.value = true;
  try {
    const { error: rpcErr } = await client.rpc('admin_set_player_status', {
      p_user_id: user.user_id,
      p_is_active: nextActive,
      p_reason: nextActive ? '' : (reason || '').trim(),
    });
    if (rpcErr) throw rpcErr;

    showNotification(
      'success',
      nextActive
        ? `Akun ${displayNameOf(user)} berhasil diaktifkan kembali.`
        : `Akun ${displayNameOf(user)} berhasil dinonaktifkan dan sesi aktifnya dicabut.`
    );
    statusModal.value = null;
    if (detailUser.value?.user_id === user.user_id) {
      detailUser.value = null;
    }
    await loadUsers();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Tidak bisa memperbarui status akun pengguna.'));
  } finally {
    acting.value = false;
  }
}

async function confirmDeleteUser() {
  if (!deletingUser.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  const target = deletingUser.value;
  acting.value = true;
  try {
    const { error: rpcErr } = await client.rpc('admin_delete_player', {
      p_user_id: target.user_id,
    });
    if (rpcErr) throw rpcErr;

    showNotification('success', `Akun "${displayNameOf(target)}" beserta seluruh progresnya berhasil dihapus permanen.`);
    deletingUser.value = null;
    if (detailUser.value?.user_id === target.user_id) {
      detailUser.value = null;
    }
    await loadUsers();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Tidak bisa menghapus akun pengguna.'));
  } finally {
    acting.value = false;
  }
}

function exportCsv() {
  if (!filteredUsers.value.length) {
    showNotification('error', 'Tidak ada data pengguna untuk diekspor.');
    return;
  }
  const headers = [
    'user_id', 'username', 'astro_id', 'display_name', 'email', 'auth_provider',
    'points', 'earned', 'selected_ship', 'owned_ships', 'is_active', 'banned_at',
    'banned_reason', 'last_sign_in_at', 'created_at',
  ];
  const rows = filteredUsers.value.map((u) => [
    u.user_id,
    u.username || '',
    u.astro_id || '',
    u.display_name || '',
    u.email || '',
    u.auth_provider || 'username',
    u.points ?? 0,
    u.earned ?? 0,
    u.selected_ship || 'astra',
    JSON.stringify(ownedShipList(u)),
    u.is_active !== false ? 'true' : 'false',
    u.banned_at || '',
    u.banned_reason || '',
    u.last_sign_in_at || '',
    u.created_at || '',
  ]);
  downloadSafeCsv(`astrosphere_users_${Date.now()}.csv`, headers, rows);
  showNotification('success', `Berhasil mengekspor ${filteredUsers.value.length} akun pengguna ke CSV.`);
}

function showNotification(type, msg) {
  notification.value = { type, msg };
  setTimeout(() => {
    notification.value = null;
  }, 4000);
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="admin-users-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Pengguna</h1>
        <p class="page-desc">Pantau akun penjelajah terdaftar, ASTRO-ID, perolehan bintang, serta kelola status aktif dan penghapusan akun.</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-head line" @click="exportCsv">
          Ekspor CSV
        </button>
        <button type="button" class="btn-head line" :disabled="refreshing" @click="handleRefresh">
          <UiIcon name="ulang" :size="15" :class="{ 'spin-active': refreshing }" />
          <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan' }}</span>
        </button>
      </div>
    </div>

    <!-- Notifikasi & Galat -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- 4 KARTU KPI RINGKAS -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-head">
          <span class="kpi-lbl">Total Penjelajah</span>
          <div class="kpi-ic total"><UiIcon name="pengguna" :size="18" /></div>
        </div>
        <b class="kpi-val">{{ totalUsers }}</b>
        <small class="kpi-sub">Akun terdaftar di sistem</small>
      </div>

      <div class="kpi-card">
        <div class="kpi-head">
          <span class="kpi-lbl">Akun Aktif</span>
          <div class="kpi-ic active"><UiIcon name="cek" :size="18" /></div>
        </div>
        <b class="kpi-val">{{ activeUsersCount }}</b>
        <small class="kpi-sub">Dapat masuk &amp; sinkronisasi</small>
      </div>

      <div class="kpi-card">
        <div class="kpi-head">
          <span class="kpi-lbl">Dinonaktifkan</span>
          <div class="kpi-ic banned"><UiIcon name="kunci" :size="18" /></div>
        </div>
        <b class="kpi-val">{{ disabledUsersCount }}</b>
        <small class="kpi-sub">Akses login &amp; sync diblokir</small>
      </div>

      <div class="kpi-card">
        <div class="kpi-head">
          <span class="kpi-lbl">Total Bintang</span>
          <div class="kpi-ic stars"><UiIcon name="bintang" :size="18" /></div>
        </div>
        <b class="kpi-val">{{ totalStarsSum.toLocaleString('id-ID') }}</b>
        <small class="kpi-sub">Saldo bintang seluruh pemain</small>
      </div>
    </div>

    <!-- BILAH FILTER -->
    <div class="card-section filters-bar">
      <div class="filter-field">
        <label>Filter Status</label>
        <select v-model="selectedStatus" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua Status ({{ users.length }})</option>
          <option value="active">Aktif ({{ activeUsersCount }})</option>
          <option value="banned">Dinonaktifkan ({{ disabledUsersCount }})</option>
        </select>
      </div>

      <div class="filter-field">
        <label>Metode Masuk</label>
        <select v-model="selectedProvider" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua Metode</option>
          <option value="google">Google</option>
          <option value="username">Username</option>
        </select>
      </div>

      <div class="filter-field search">
        <label>Pencarian Pengguna</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama, @username, ASTRO-ID, atau email…"
          class="adm-input"
          @input="currentPage = 1"
        />
      </div>

      <button type="button" class="btn-head line" @click="resetFilters">Reset</button>
    </div>

    <!-- TABEL PENGGUNA -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat daftar pengguna…</p>
      </div>

      <div v-else-if="!filteredUsers.length" class="empty-state">
        <UiIcon name="pengguna" :size="28" />
        <p v-if="users.length">Tidak ada akun pengguna yang cocok dengan filter atau kata kunci pencarian.</p>
        <p v-else>Belum ada pengguna terdaftar.</p>
        <button v-if="users.length" type="button" class="btn-head line" @click="resetFilters">Tampilkan Semua</button>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th>Penjelajah</th>
            <th>ASTRO-ID</th>
            <th>Username / Email &amp; Metode</th>
            <th>Bintang &amp; Pesawat</th>
            <th>Daftar / Terakhir Masuk</th>
            <th>Status</th>
            <th style="width: 195px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in paginatedUsers" :key="u.user_id" :class="{ 'row-banned': u.is_active === false }">
            <td>
              <div class="user-id-cell">
                <div class="user-avatar" :class="{ banned: u.is_active === false }">
                  {{ initialsOf(u) }}
                </div>
                <div>
                  <b class="u-name">{{ displayNameOf(u) }}</b>
                  <small class="u-handle">@{{ u.username }}</small>
                </div>
              </div>
            </td>
            <td>
              <span class="astro-pill">{{ u.astro_id || '—' }}</span>
            </td>
            <td>
              <div class="method-cell">
                <span class="prov-badge" :class="u.auth_provider === 'google' ? 'google' : 'uname'">
                  {{ u.auth_provider === 'google' ? 'Google' : 'Username' }}
                </span>
                <small class="u-email">{{ u.email || `${u.username}@player.astrosphere.app` }}</small>
              </div>
            </td>
            <td>
              <div class="star-ship-cell">
                <b>★ {{ (u.points ?? 0).toLocaleString('id-ID') }} <small>(total {{ (u.earned ?? 0).toLocaleString('id-ID') }})</small></b>
                <small class="ship-sub">{{ shipLabel(u.selected_ship) }} · {{ ownedShipList(u).length }} armada</small>
              </div>
            </td>
            <td>
              <div class="date-cell">
                <span>Daftar: {{ fmtDate(u.created_at) }}</span>
                <small>Masuk: {{ fmtDate(u.last_sign_in_at) }}</small>
              </div>
            </td>
            <td>
              <div class="status-cell">
                <button
                  v-if="isProtectedAdminRow(u)"
                  type="button"
                  class="adm-switch-btn on is-locked"
                  disabled
                  title="Akun administrator terlindungi"
                >
                  <span class="adm-switch-track" aria-hidden="true">
                    <span class="adm-switch-thumb" />
                  </span>
                  <span class="adm-switch-label">Aktif</span>
                </button>
                <button
                  v-else
                  type="button"
                  class="adm-switch-btn"
                  :class="{ on: u.is_active !== false }"
                  :disabled="acting"
                  :title="u.is_active !== false ? 'Klik untuk menonaktifkan akun' : 'Klik untuk mengaktifkan akun'"
                  @click="openStatusModal(u, u.is_active === false)"
                >
                  <span class="adm-switch-track" aria-hidden="true">
                    <span class="adm-switch-thumb" />
                  </span>
                  <span class="adm-switch-label">{{ u.is_active !== false ? 'Aktif' : 'Nonaktif' }}</span>
                </button>
                <small v-if="u.is_active === false && u.banned_reason" class="ban-reason" :title="u.banned_reason">
                  {{ u.banned_reason }}
                </small>
              </div>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-row-act detail" title="Lihat Detail Pengguna" @click="detailUser = u">
                  <UiIcon name="mata" :size="14" />
                  <span>Detail</span>
                </button>
                <span v-if="isProtectedAdminRow(u)" class="admin-protected-tag" title="Akun administrator terlindungi">
                  Admin
                </span>
                <button
                  v-else
                  type="button"
                  class="btn-icon del"
                  :disabled="acting"
                  title="Hapus Akun Permanen"
                  @click="openDeleteModal(u)"
                >
                  <UiIcon name="hapus" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINASI -->
      <div v-if="filteredUsers.length > itemsPerPage" class="pagination-bar">
        <span>Menampilkan {{ paginatedUsers.length }} dari {{ filteredUsers.length }} pengguna</span>
        <div class="page-btns">
          <button type="button" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>
    </div>

    <!-- MODAL 1: DETAIL AKUN PENGGUNA -->
    <div v-if="detailUser" class="modal-backdrop" @click.self="detailUser = null">
      <div class="modal-card">
        <div class="modal-header">
          <div class="detail-head-user">
            <div class="user-avatar lg" :class="{ banned: detailUser.is_active === false }">
              {{ initialsOf(detailUser) }}
            </div>
            <div>
              <h3 class="modal-title">{{ displayNameOf(detailUser) }}</h3>
              <p class="modal-sub">
                @{{ detailUser.username }} ·
                <span class="astro-inline">{{ detailUser.astro_id || 'ASTRO-ID belum ada' }}</span>
              </p>
            </div>
          </div>
          <button type="button" class="btn-close-modal" @click="detailUser = null"><UiIcon name="tutup" :size="18" /></button>
        </div>

        <div class="modal-body scroll">
          <div v-if="detailUser.is_active === false" class="ban-alert-box">
            <b>Akun Dinonaktifkan</b>
            <p>Waktu blokir: {{ fmtDate(detailUser.banned_at) }}</p>
            <p>Alasan: {{ detailUser.banned_reason || 'Tidak ada keterangan alasan.' }}</p>
          </div>

          <div class="detail-grid">
            <div class="detail-box">
              <small>Status Akun</small>
              <b>{{ detailUser.is_active !== false ? 'Aktif' : 'Dinonaktifkan' }}</b>
            </div>
            <div class="detail-box">
              <small>Metode Masuk</small>
              <b>{{ detailUser.auth_provider === 'google' ? 'Google' : 'Username & Sandi' }}</b>
            </div>
            <div class="detail-box">
              <small>Saldo Bintang Aktif</small>
              <b>★ {{ (detailUser.points ?? 0).toLocaleString('id-ID') }}</b>
            </div>
            <div class="detail-box">
              <small>Total Bintang Diperoleh</small>
              <b>★ {{ (detailUser.earned ?? 0).toLocaleString('id-ID') }}</b>
            </div>
          </div>

          <div class="detail-list-card">
            <div class="dl-row"><span>ID Pengguna (UUID)</span><code>{{ detailUser.user_id }}</code></div>
            <div class="dl-row"><span>Email Terdaftar</span><b>{{ detailUser.email || '—' }}</b></div>
            <div class="dl-row"><span>Pesawat Aktif</span><b>{{ shipLabel(detailUser.selected_ship) }}</b></div>
            <div class="dl-row">
              <span>Armada Dimiliki</span>
              <div class="ship-tags">
                <span v-for="sId in ownedShipList(detailUser)" :key="sId" class="ship-chip">{{ shipLabel(sId) }}</span>
              </div>
            </div>
            <div class="dl-row"><span>Terakhir Masuk</span><b>{{ fmtDate(detailUser.last_sign_in_at) }}</b></div>
            <div class="dl-row"><span>Tanggal Daftar</span><b>{{ fmtDate(detailUser.created_at) }}</b></div>
            <div class="dl-row"><span>Pembaruan Progres</span><b>{{ fmtDate(detailUser.updated_at) }}</b></div>
          </div>

          <div class="modal-footer between">
            <button
              v-if="!isProtectedAdminRow(detailUser)"
              type="button"
              class="btn-danger-outline"
              :disabled="acting"
              @click="openDeleteModal(detailUser)"
            >
              Hapus Permanen
            </button>
            <span v-else class="admin-protected-tag">Akun Administrator Terlindungi</span>
            <div class="foot-right">
              <button type="button" class="btn-cancel" @click="detailUser = null">Tutup</button>
              <button
                v-if="!isProtectedAdminRow(detailUser)"
                type="button"
                :class="detailUser.is_active !== false ? 'btn-warn' : 'btn-save'"
                :disabled="acting"
                @click="openStatusModal(detailUser, detailUser.is_active === false)"
              >
                {{ detailUser.is_active !== false ? 'Nonaktifkan Akun' : 'Aktifkan Kembali' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 2: KONFIRMASI NONAKTIFKAN / AKTIFKAN -->
    <div v-if="statusModal" class="modal-backdrop" @click.self="!acting && (statusModal = null)">
      <div class="modal-card small">
        <h3 class="modal-title">
          {{ statusModal.nextActive ? 'Aktifkan Kembali Akun?' : 'Nonaktifkan Akun Pengguna?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="!statusModal.nextActive">
            Akun <b>{{ displayNameOf(statusModal.user) }}</b> (@{{ statusModal.user.username }}) akan langsung dikeluarkan dari semua sesi aktif dan diblokir untuk login kembali hingga diaktifkan ulang.
          </template>
          <template v-else>
            Akses masuk dan sinkronisasi untuk <b>{{ displayNameOf(statusModal.user) }}</b> (@{{ statusModal.user.username }}) akan dipulihkan sepenuhnya.
          </template>
        </p>

        <label v-if="!statusModal.nextActive" class="field">
          <span>Alasan Penonaktifan (Opsional)</span>
          <textarea
            v-model="statusModal.reason"
            rows="3"
            placeholder="misal: Pelanggaran aturan komunitas atau permintaan peninjauan akun…"
          />
        </label>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="acting" @click="statusModal = null">Batal</button>
          <button
            type="button"
            :class="statusModal.nextActive ? 'btn-save' : 'btn-warn'"
            :disabled="acting"
            @click="confirmStatusChange"
          >
            {{ acting ? 'Memproses…' : (statusModal.nextActive ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan') }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: KONFIRMASI HAPUS PERMANEN -->
    <div v-if="deletingUser" class="modal-backdrop" @click.self="!acting && (deletingUser = null)">
      <div class="modal-card small">
        <div class="danger-header">
          <div class="danger-ic"><UiIcon name="silang" :size="20" /></div>
          <h3 class="modal-title">Hapus Akun Permanen?</h3>
        </div>
        <div class="danger-warning-box">
          Tindakan ini akan menghapus akun <b>{{ displayNameOf(deletingUser) }}</b> (@{{ deletingUser.username }}) dari sistem autentikasi, mencabut seluruh sesi aktif, dan menghapus seluruh progres bintang serta armada pesawat secara permanen. <b>Tindakan ini tidak dapat dibatalkan.</b>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="acting" @click="deletingUser = null">Batal</button>
          <button type="button" class="btn-danger" :disabled="acting" @click="confirmDeleteUser">
            {{ acting ? 'Menghapus…' : 'Hapus Permanen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-users-page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-head { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.btn-head.line { background: #ffffff; border-color: #cbd5e1; color: #334155; }
.btn-head.line:hover { background: #f8fafc; }

.spin-active { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dash-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.dash-alert.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.dash-alert.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

/* KPI Ringkas */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
.kpi-head { display: flex; align-items: center; justify-content: space-between; }
.kpi-lbl { font-size: 12px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.kpi-ic { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; }
.kpi-ic.total { background: #eff6ff; color: #2563eb; }
.kpi-ic.active { background: #f0fdf4; color: #16a34a; }
.kpi-ic.banned { background: #fef2f2; color: #dc2626; }
.kpi-ic.stars { background: #fffbeb; color: #d97706; }
.kpi-val { font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.1; }
.kpi-sub { font-size: 12px; color: #64748b; }

/* Filter & Table */
.card-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
.filters-bar { display: flex; align-items: flex-end; gap: 14px; padding: 14px 18px; flex-wrap: wrap; }
.filter-field { display: flex; flex-direction: column; gap: 4px; min-width: 170px; }
.filter-field.search { flex: 1; min-width: 240px; }
.filter-field label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
.adm-select, .adm-input { height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background: #ffffff; color: #0f172a; }

.table-wrap { overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.adm-table th { background: #f8fafc; padding: 12px 14px; font-weight: 600; color: #475569; font-size: 11.5px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.adm-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }
.adm-table tbody tr.row-banned { background: #fffafa; }

.user-id-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 36px; height: 36px; border-radius: 10px; background: #2563eb; color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 600; flex: none; }
.user-avatar.banned { background: #94a3b8; }
.user-avatar.lg { width: 44px; height: 44px; border-radius: 12px; font-size: 15px; }
.u-name { display: block; font-size: 13.5px; font-weight: 600; color: #0f172a; }
.u-handle { font-size: 12px; color: #64748b; }

.astro-pill { font-family: inherit; font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 500; background: #f1f5f9; color: #334155; padding: 4px 8px; border-radius: 6px; white-space: nowrap; }

.method-cell { display: flex; flex-direction: column; gap: 3px; }
.prov-badge { align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.prov-badge.google { background: #eff6ff; color: #1d4ed8; }
.prov-badge.uname { background: #f1f5f9; color: #475569; }
.u-email { font-size: 11.5px; color: #64748b; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.star-ship-cell b { display: block; font-size: 13px; font-weight: 600; color: #b45309; }
.star-ship-cell b small { font-weight: 500; color: #64748b; font-size: 11.5px; }
.ship-sub { font-size: 11.5px; color: #64748b; }

.date-cell { display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; color: #334155; white-space: nowrap; }
.date-cell small { color: #64748b; }

.status-cell { display: flex; flex-direction: column; gap: 3px; }
.status-pill { align-self: flex-start; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.status-pill.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.status-pill.ban { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.ban-reason { font-size: 11px; color: #b91c1c; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: nowrap; white-space: nowrap; }
.btn-row-act { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 12px; font-weight: 500; cursor: pointer; color: #334155; white-space: nowrap; }
.btn-row-act.detail:hover { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.btn-row-act.warn { color: #b45309; border-color: #fde68a; background: #fffbeb; }
.btn-row-act.warn:hover { background: #fef3c7; }
.btn-row-act.ok { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
.btn-row-act.ok:hover { background: #dcfce7; }

.btn-icon { width: 29px; height: 29px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; display: grid; place-items: center; cursor: pointer; color: #64748b; }
.btn-icon.del:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.admin-protected-tag { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11.5px; font-weight: 500; white-space: nowrap; }

.loading-state, .empty-state { padding: 48px 20px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #e2e8f0; border-top-color: #2563eb; animation: spin 0.8s linear infinite; }

.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
.page-btns { display: flex; align-items: center; gap: 8px; }
.page-btns button { padding: 5px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 12.5px; cursor: pointer; }
.page-btns button:disabled { opacity: 0.5; cursor: not-allowed; }
.page-ind { font-size: 12.5px; font-weight: 500; color: #334155; }

/* Modals */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 640px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
.modal-card.small { max-width: 460px; padding: 24px; gap: 14px; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.detail-head-user { display: flex; align-items: center; gap: 12px; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12.5px; color: #64748b; }
.astro-inline { font-family: inherit; font-variant-numeric: tabular-nums; color: #334155; }
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; padding: 4px; }

.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-desc { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.5; }

.ban-alert-box { padding: 12px 14px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; }
.ban-alert-box b { display: block; font-weight: 600; margin-bottom: 4px; }
.ban-alert-box p { margin: 2px 0; }

.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.detail-box { padding: 12px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
.detail-box small { display: block; font-size: 11.5px; color: #64748b; }
.detail-box b { font-size: 15px; font-weight: 600; color: #0f172a; }

.detail-list-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; }
.dl-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 7px; }
.dl-row:last-child { border-bottom: none; padding-bottom: 0; }
.dl-row span { color: #64748b; }
.dl-row b { color: #0f172a; font-weight: 500; text-align: right; }
.dl-row code { font-family: inherit; font-size: 12px; color: #334155; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
.ship-tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.ship-chip { font-size: 11.5px; font-weight: 500; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 999px; }

.field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field textarea { padding: 9px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; resize: vertical; }

.danger-header { display: flex; align-items: center; gap: 10px; }
.danger-ic { width: 34px; height: 34px; border-radius: 8px; background: #fef2f2; color: #dc2626; display: grid; place-items: center; flex: none; }
.danger-warning-box { padding: 12px 14px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; font-size: 13px; line-height: 1.5; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.modal-footer.between { justify-content: space-between; }
.foot-right { display: flex; gap: 8px; }

.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-warn { padding: 8px 18px; border-radius: 6px; border: none; background: #d97706; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger-outline { padding: 8px 14px; border-radius: 6px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; font-size: 13px; font-weight: 500; cursor: pointer; }
</style>
