<script setup>
// Dasbor Utama Pengelola AstroSphere (Admin Dashboard)
// Menampilkan metrik data Supabase, Validator Ekonomi Hanggar dinamis, dan riwayat pembaruan terakhir.
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError } from '~/utils/adminAuth.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const loading = ref(true);
const refreshing = ref(false);
const error = ref('');

const stats = ref({
  planetsTotal: 0,
  planetsActive: 0,
  historyEvents: 0,
  phenomenaTotal: 0,
  phenomenaActive: 0,
  questions: 0,
  factsTotal: 0,
  factsActive: 0,
  mythsTotal: 0,
  mythsActive: 0,
  shipsTotal: 0,
  shipsActive: 0,
  usersTotal: 0,
  usersActive: 0,
});

const activeTotalQuizPoints = ref(0);
const targetHangarPoints = ref(1000); // Standar total Orion (300) + Nova (700)
const incompletePlanets = ref([]);
const recentUpdates = ref([]);

// Perhitungan Validator Ekonomi Hanggar
const economyRatio = computed(() => {
  if (targetHangarPoints.value <= 0) return 100;
  return Math.round((activeTotalQuizPoints.value / targetHangarPoints.value) * 100);
});

const economyStatus = computed(() => {
  const diff = activeTotalQuizPoints.value - targetHangarPoints.value;
  if (diff >= 0 && diff <= 200) {
    return {
      type: 'optimal',
      label: 'Ekonomi Seimbang',
      desc: 'Poin kuis pada planet aktif cukup untuk membuka seluruh armada pesawat hanggar.',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    };
  }
  if (diff < 0) {
    return {
      type: 'deficit',
      label: `Defisit Poin (${Math.abs(diff)} Bintang)`,
      desc: 'Siswa belum dapat membuka semua pesawat meskipun menjawab benar semua kuis planet aktif.',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
    };
  }
  return {
    type: 'surplus',
    label: `Surplus Poin (+${diff} Bintang)`,
    desc: 'Total poin kuis melebihi harga armada hanggar, memberikan kelonggaran bagi siswa.',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  };
});

async function loadDashboardData() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const [planetsRes, historyRes, phenoRes, questionsRes, shipsRes, factsRes, mythsRes, usersRes] = await Promise.all([
      client.from('planets').select('planet_id, nama, is_active, updated_at').order('urutan_planet'),
      client.from('history_events').select('event_id, planet_id, judul, is_active, created_at'),
      client.from('phenomena').select('phenomenon_id, is_active'),
      client.from('questions').select('question_id, planet_id, soal, bobot_poin, is_active, created_at'),
      client.from('ships').select('ship_id, nama, harga_poin, is_active'),
      client.from('facts').select('fact_id, body_id, judul, is_active, created_at'),
      client.from('myths').select('myth_id, benda_langit, pernyataan, is_active, created_at'),
      client.rpc('admin_list_players').then(
        (res) => res,
        (err) => ({ data: [], error: err || new Error('Gagal memanggil admin_list_players') })
      ),
    ]);

    if (planetsRes.error) throw planetsRes.error;
    if (historyRes.error) throw historyRes.error;
    if (phenoRes.error) throw phenoRes.error;
    if (questionsRes.error) throw questionsRes.error;
    if (shipsRes.error) throw shipsRes.error;
    if (factsRes.error) throw factsRes.error;
    if (mythsRes.error) throw mythsRes.error;
    if (usersRes?.error) {
      console.warn('[AstroSphere Admin] Gagal memuat ringkasan pemain:', usersRes.error);
    }

    const planets = planetsRes.data || [];
    const history = historyRes.data || [];
    const phenomena = phenoRes.data || [];
    const questions = questionsRes.data || [];
    const ships = shipsRes.data || [];
    const factsList = factsRes.data || [];
    const mythsList = mythsRes.data || [];
    const usersList = Array.isArray(usersRes?.data) ? usersRes.data : [];

    // 1. Hitung total target harga hanggar dari armada aktif di DB
    const activeShips = ships.filter((s) => s.is_active !== false);
    const totalShipsCost = activeShips.reduce((sum, s) => sum + (Number(s.harga_poin) || 0), 0);
    if (ships.length > 0) {
      targetHangarPoints.value = totalShipsCost;
    }

    // 2. Filter planet aktif
    const activePlanets = planets.filter((p) => p.is_active !== false);
    const activePlanetIds = new Set(activePlanets.map((p) => p.planet_id));

    // 3. Hitung poin kuis pada planet aktif
    let quizPointsSum = 0;
    const historyCountMap = new Map();
    const quizCountMap = new Map();

    for (const h of history) {
      if (h.is_active === false) continue;
      historyCountMap.set(h.planet_id, (historyCountMap.get(h.planet_id) || 0) + 1);
    }

    for (const q of questions) {
      if (q.is_active === false) continue;
      quizCountMap.set(q.planet_id, (quizCountMap.get(q.planet_id) || 0) + 1);
      if (activePlanetIds.has(q.planet_id)) {
        quizPointsSum += Number(q.bobot_poin) || 50;
      }
    }

    activeTotalQuizPoints.value = quizPointsSum;

    // 4. Deteksi planet aktif yang belum lengkap
    const incomplete = [];
    for (const p of activePlanets) {
      const hCount = historyCountMap.get(p.planet_id) || 0;
      const qCount = quizCountMap.get(p.planet_id) || 0;
      if (hCount === 0 || qCount === 0) {
        incomplete.push({
          planet_id: p.planet_id,
          nama: p.nama,
          historyCount: hCount,
          questionCount: qCount,
        });
      }
    }
    incompletePlanets.value = incomplete;

    // 5. Susun metrik ringkasan (item aktif)
    stats.value = {
      planetsTotal: planets.length,
      planetsActive: activePlanets.length,
      historyEvents: history.filter((h) => h.is_active !== false).length,
      phenomenaTotal: phenomena.length,
      phenomenaActive: phenomena.filter((ph) => ph.is_active !== false).length,
      questions: questions.filter((q) => q.is_active !== false).length,
      factsTotal: factsList.length,
      factsActive: factsList.filter((f) => f.is_active !== false).length,
      mythsTotal: mythsList.length,
      mythsActive: mythsList.filter((m) => m.is_active !== false).length,
      shipsTotal: ships.length,
      shipsActive: activeShips.length,
      usersTotal: usersList.length,
      usersActive: usersList.filter((u) => u.is_active !== false).length,
    };

    // 6. Susun 5 pembaruan materi terakhir
    const updates = [];
    for (const p of planets) {
      if (p.updated_at) {
        updates.push({
          id: `p-${p.planet_id}`,
          module: 'Planet',
          title: `Planet ${p.nama}`,
          planetId: p.planet_id,
          timestamp: p.updated_at,
          href: '/admin/planets',
        });
      }
    }
    for (const h of history) {
      if (h.created_at) {
        updates.push({
          id: `h-${h.event_id}`,
          module: 'Sejarah',
          title: h.judul,
          planetId: h.planet_id,
          timestamp: h.created_at,
          href: '/admin/history',
        });
      }
    }
    for (const q of questions) {
      if (q.created_at) {
        updates.push({
          id: `q-${q.question_id}`,
          module: 'Kuis',
          title: q.soal,
          planetId: q.planet_id,
          timestamp: q.created_at,
          href: '/admin/quizzes',
        });
      }
    }
    for (const f of factsList) {
      if (f.created_at) {
        updates.push({
          id: `f-${f.fact_id}`,
          module: 'Fakta',
          title: f.judul,
          planetId: f.body_id,
          timestamp: f.created_at,
          href: '/admin/facts',
        });
      }
    }
    for (const m of mythsList) {
      if (m.created_at) {
        updates.push({
          id: `m-${m.myth_id}`,
          module: 'Mitos',
          title: m.pernyataan,
          planetId: m.benda_langit,
          timestamp: m.created_at,
          href: '/admin/myths',
        });
      }
    }

    updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentUpdates.value = updates.slice(0, 5);
  } catch (err) {
    error.value = formatSupabaseError(err, 'Tidak bisa memuat data dasbor.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadDashboardData();
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="admin-dash-page">
    <!-- Header Dasbor -->
    <div class="page-head">
      <div>
        <h1 class="page-title">Dasbor Ringkasan Pengelola</h1>
        <p class="page-desc">Pantau status konten kurikulum, validasi ekonomi poin siswa, dan integritas materi publik.</p>
      </div>
      <button class="btn-refresh" :disabled="refreshing" @click="handleRefresh">
        <UiIcon name="ulang" :size="16" :class="{ 'spin-active': refreshing }" />
        <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan Data' }}</span>
      </button>
    </div>

    <!-- Alert Error Jika Ada -->
    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- 4 KARTU METRIK UTAMA -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Planet Terdaftar</span>
          <div class="mc-icon planet"><UiIcon name="planet" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.planetsActive }} <small>/ {{ stats.planetsTotal }} Aktif</small></div>
        <NuxtLink to="/admin/planets" class="mc-link">Kelola Planet →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Sejarah</span>
          <div class="mc-icon history"><UiIcon name="sejarah" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.historyEvents }} <small>Catatan</small></div>
        <NuxtLink to="/admin/history" class="mc-link">Kelola Linimasa →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Laboratorium Fenomena</span>
          <div class="mc-icon pheno"><UiIcon name="fenomena" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.phenomenaActive }} <small>/ {{ stats.phenomenaTotal }} Aktif</small></div>
        <NuxtLink to="/admin/phenomena" class="mc-link">Kelola Fenomena →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Bank Soal Kuis</span>
          <div class="mc-icon quiz"><UiIcon name="kuis" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.questions }} <small>Pertanyaan</small></div>
        <NuxtLink to="/admin/quizzes" class="mc-link">Kelola Soal →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Tahukah Kamu?</span>
          <div class="mc-icon facts"><UiIcon name="jurnal" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.factsActive }} <small>/ {{ stats.factsTotal }} Aktif</small></div>
        <NuxtLink to="/admin/facts" class="mc-link">Kelola Kartu Fakta →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Mitos atau Fakta</span>
          <div class="mc-icon myths"><UiIcon name="cek" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.mythsActive }} <small>/ {{ stats.mythsTotal }} Aktif</small></div>
        <NuxtLink to="/admin/myths" class="mc-link">Kelola Pernyataan →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Hanggar Pesawat</span>
          <div class="mc-icon ships"><UiIcon name="hanggar" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.shipsActive }} <small>/ {{ stats.shipsTotal }} Aktif</small></div>
        <NuxtLink to="/admin/ships" class="mc-link">Kelola Armada →</NuxtLink>
      </div>

      <div class="metric-card">
        <div class="mc-head">
          <span class="mc-label">Pengguna Terdaftar</span>
          <div class="mc-icon users"><UiIcon name="pengguna" :size="20" /></div>
        </div>
        <div class="mc-val">{{ stats.usersActive }} <small>/ {{ stats.usersTotal }} Aktif</small></div>
        <NuxtLink to="/admin/users" class="mc-link">Kelola Pengguna →</NuxtLink>
      </div>
    </div>

    <!-- VALIDATOR EKONOMI HANGGAR DINAMIS -->
    <div class="card-section economy-card">
      <div class="ec-header">
        <div>
          <span class="sec-badge">Ekonomi Poin Siswa</span>
          <h2 class="sec-title">Validator Kelayakan Armada Hanggar</h2>
          <p class="sec-desc">Memastikan jumlah poin kuis pada planet aktif dapat mencukupi pembukaan armada pesawat di Hanggar.</p>
        </div>
        <div
          class="status-pill"
          :style="{
            backgroundColor: economyStatus.bg,
            color: economyStatus.color,
            borderColor: economyStatus.border
          }"
        >
          <UiIcon name="cek" :size="15" />
          <span>{{ economyStatus.label }}</span>
        </div>
      </div>

      <div class="ec-stats-row">
        <div class="stat-box">
          <small>Total Poin Kuis (Planet Aktif)</small>
          <b>{{ activeTotalQuizPoints }} Bintang</b>
        </div>
        <div class="stat-box">
          <small>Target Pembelian Armada Hanggar</small>
          <b>{{ targetHangarPoints }} Bintang</b>
        </div>
        <div class="stat-box">
          <small>Rasio Ketersediaan Poin</small>
          <b :style="{ color: economyStatus.color }">{{ economyRatio }}%</b>
        </div>
      </div>

      <div class="ec-bar-wrap">
        <div class="ec-bar" :style="{ width: Math.min(100, economyRatio) + '%', backgroundColor: economyStatus.color }" />
      </div>
      <p class="ec-note">{{ economyStatus.desc }}</p>
    </div>

    <!-- PERINGATAN PLANET BELUM LENGKAP JIKA ADA -->
    <div v-if="incompletePlanets.length" class="card-section warn-card">
      <div class="wc-head">
        <UiIcon name="info" :size="20" />
        <b>{{ incompletePlanets.length }} Planet Aktif Belum Memiliki Konten Lengkap</b>
      </div>
      <p class="wc-desc">Siswa tidak dapat mengerjakan kuis atau melihat lintasan sejarah jika modul belum diisi:</p>
      <div class="incomplete-grid">
        <div v-for="p in incompletePlanets" :key="p.planet_id" class="inc-planet-item">
          <b>Planet {{ p.nama }}</b>
          <span>{{ p.historyCount === 0 ? 'Belum ada Sejarah' : `${p.historyCount} Sejarah` }}</span>
          <span>{{ p.questionCount === 0 ? 'Belum ada Soal Kuis' : `${p.questionCount} Soal` }}</span>
        </div>
      </div>
    </div>

    <!-- 5 PEMBARUAN TERAKHIR -->
    <div class="card-section recent-card">
      <div class="rc-header">
        <h2 class="sec-title">5 Pembaruan Konten Terakhir</h2>
        <span class="rc-sub">Log penambahan dan penyuntingan materi terbaru</span>
      </div>

      <div v-if="!recentUpdates.length" class="empty-log">
        Belum ada catatan pembaruan materi.
      </div>
      <div v-else class="log-list">
        <NuxtLink
          v-for="item in recentUpdates"
          :key="item.id"
          :to="item.href"
          class="log-row"
        >
          <div class="lr-left">
            <span class="mod-badge" :class="item.module.toLowerCase()">{{ item.module }}</span>
            <b class="lr-title">{{ item.title }}</b>
            <span class="lr-planet">({{ item.planetId }})</span>
          </div>
          <div class="lr-right">
            <span>{{ formatDate(item.timestamp) }}</span>
            <UiIcon name="lanjut" :size="14" />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dash-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
}
.page-desc {
  margin: 4px 0 0 0;
  font-size: 13.5px;
  color: #64748b;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-refresh:hover:not(:disabled) {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}
.spin-active {
  animation: adm-spin 0.8s linear infinite;
}

.dash-alert.error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 13.5px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.metric-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mc-label {
  font-size: 12.5px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.mc-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.mc-icon.planet { background-color: #eff6ff; color: #2563eb; }
.mc-icon.history { background-color: #f0fdf4; color: #16a34a; }
.mc-icon.pheno { background-color: #fffbeb; color: #d97706; }
.mc-icon.quiz { background-color: #f5f3ff; color: #7c3aed; }
.mc-icon.facts { background-color: #ecfeff; color: #0891b2; }
.mc-icon.myths { background-color: #fef2f2; color: #e11d48; }
.mc-icon.ships { background-color: #eef2ff; color: #4f46e5; }
.mc-icon.users { background-color: #f0f9ff; color: #0284c7; }

.mc-val {
  font-size: 26px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.1;
}
.mc-val small {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}
.mc-link {
  margin-top: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #2563eb;
  text-decoration: none;
}
.mc-link:hover {
  text-decoration: underline;
}

/* Sections */
.card-section {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.sec-badge {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #2563eb;
  margin-bottom: 2px;
  display: block;
}
.sec-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}
.sec-desc {
  margin: 3px 0 0 0;
  font-size: 13px;
  color: #64748b;
}

/* Economy */
.ec-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
}
.ec-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 10px;
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
}
.stat-box small {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 2px;
}
.stat-box b {
  font-size: 16px;
  color: #0f172a;
}
.ec-bar-wrap {
  width: 100%;
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 999px;
  margin-top: 16px;
  overflow: hidden;
}
.ec-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.ec-note {
  margin: 10px 0 0 0;
  font-size: 12.5px;
  color: #64748b;
}

/* Warn */
.warn-card {
  background-color: #fffbeb;
  border-color: #fde68a;
}
.wc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b45309;
  font-size: 15px;
}
.wc-desc {
  margin: 6px 0 12px 0;
  font-size: 13px;
  color: #92400e;
}
.incomplete-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.inc-planet-item {
  background-color: #ffffff;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #fef3c7;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.inc-planet-item b {
  color: #0f172a;
  font-size: 13px;
}
.inc-planet-item span {
  color: #d97706;
}

/* Recent */
.rc-header {
  margin-bottom: 12px;
}
.rc-sub {
  font-size: 12.5px;
  color: #64748b;
}
.empty-log {
  padding: 18px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
.log-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.log-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  text-decoration: none;
  color: #334155;
  transition: background 0.15s;
}
.log-row:last-child {
  border-bottom: none;
}
.log-row:hover {
  background-color: #f8fafc;
}
.lr-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.mod-badge {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
}
.mod-badge.planet { background-color: #eff6ff; color: #1d4ed8; }
.mod-badge.sejarah { background-color: #f0fdf4; color: #15803d; }
.mod-badge.kuis { background-color: #f5f3ff; color: #6d28d9; }
.lr-title {
  font-size: 13.5px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lr-planet {
  font-size: 12px;
  color: #94a3b8;
}
.lr-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  flex: none;
}
</style>
