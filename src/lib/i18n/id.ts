export const id = {
  appName: 'AstroSphere',
  appDescription: 'Eksplorasi interaktif tata surya',
  skipLink: 'Lewati ke tampilan kanvas 3D',
  reducedMotion: 'Kurangi animasi',
  quality: 'Kualitas visual',
  qualityLow: 'Rendah',
  qualityMid: 'Sedang',
  qualityHigh: 'Tinggi',
  canvasLabel: 'Kanvas 3D tata surya AstroSphere',
  canvasRoleDesc: 'Kanvas 3D interaktif real-time',
  loadingAsset: 'Memuat tekstur planet...',

  // Pengumuman Pembaca Layar Dinamis
  announcements: {
    solarSystemView:
      'Menampilkan seluruh Tata Surya. Semua planet bergerak mengorbit Matahari secara real-time.',
    viewingBody: (name: string, type: string) =>
      `Kamera berfokus pada ${name} (${type}).`,
    viewingPoi: (poiName: string, bodyName: string) =>
      `Membuka titik minat ${poiName} pada planet ${bodyName}. Kamera bergeser ke kiri.`,
  },

  // Pencarian & Palet Perintah (FR-06)
  search: {
    buttonLabel: 'Cari benda langit dan titik minat (Ctrl+K)',
    dialogTitle: 'Pencarian Tata Surya',
    placeholder:
      'Ketik nama planet, bulan, atau titik minat (mis. Mars, Olympus Mons, Badai Merah)...',
    noResults: (query: string) =>
      `Tidak ditemukan benda langit atau titik minat untuk "${query}".`,
    instruction:
      'Gunakan tombol Panah ↑↓ untuk navigasi, Enter untuk memilih dan terbang, Esc untuk menutup.',
    categories: {
      planets: 'Planet & Bintang',
      moons: 'Satelit Alami (Bulan)',
      pois: 'Titik Minat (POI)',
    },
    clearSearch: 'Bersihkan pencarian',
    closeSearch: 'Tutup pencarian',
  },

  // Drawer Daftar Benda Langit (FR-06 Alternatif Non-Kanvas)
  drawer: {
    buttonLabel: 'Daftar benda langit dan alternatif teks',
    title: 'Direktori Benda Langit Tata Surya',
    subtitle:
      'Alternatif non-kanvas ramah pembaca layar dengan deskripsi teks lengkap',
    closeLabel: 'Tutup direktori benda langit',
    filterAll: 'Semua Objek',
    filterPlanets: 'Planet',
    filterMoons: 'Bulan',
    filterPois: 'Titik Minat',
    flyTo: (name: string) => `Terbang ke ${name}`,
  },

  // Pengaturan Kualitas & Performa (FR-12)
  performance: {
    autoDeclineToast: (from: string, to: string) =>
      `Performa menurun di bawah 30 FPS. Kualitas visual dialihkan otomatis dari ${from} ke ${to} untuk menjaga kelancaran.`,
    undo: 'Urungkan',
    shadows: 'Bayangan 3D',
    bloom: 'Efek Cahaya (Glow)',
    starfield: 'Kepadatan Bintang',
    textureResolution: 'Resolusi Tekstur',
    sphereSegments: 'Detail Mesh Bola',
    particleCountLabel: 'Partikel Badai',
  },

  // Halaman Pengganti WebGL2
  webglFallback: {
    title: 'Akselerasi 3D WebGL2 Tidak Terdeteksi',
    description:
      'AstroSphere memerlukan WebGL2 dan akselerasi perangkat keras kartu grafis untuk merender visualisasi 3D secara real-time. Anda tetap dapat menjelajahi seluruh konten astronomi, sejarah, dan data terstruktur melalui direktori teks di bawah ini.',
    recommendationTitle: 'Panduan Mengaktifkan WebGL2:',
    recommendations: [
      'Gunakan peramban modern seperti Google Chrome, Mozilla Firefox, atau Microsoft Edge versi terbaru.',
      'Pastikan fitur "Akselerasi Perangkat Keras" (Hardware Acceleration) aktif pada pengaturan peramban Anda (Settings > System > Use hardware acceleration).',
      'Perbarui driver kartu grafis perangkat Anda ke versi stabil terbaru.',
    ],
    directoryTitle: 'Direktori Teks Sains Astronomi',
  },

  // Panduan Pintasan Keyboard (Tombol ?)
  shortcuts: {
    buttonLabel: 'Panduan pintasan keyboard (?)',
    title: 'Pintasan Keyboard AstroSphere',
    closeLabel: 'Tutup panduan pintasan keyboard',
    list: [
      {
        keys: ['Ctrl', 'K'],
        label: 'Buka pencarian & palet perintah cepat',
      },
      {
        keys: ['?'],
        label: 'Tampilkan panduan pintasan keyboard',
      },
      {
        keys: ['Panah'],
        label: 'Putar sudut pandang kamera (360 derajat)',
      },
      {
        keys: ['+', '-'],
        label: 'Perbesar atau perkecil jarak zoom kamera',
      },
      {
        keys: ['Space'],
        label: 'Jeda atau mulai pergerakan orbit planet',
      },
      {
        keys: ['Home'],
        label: 'Reset sudut kamera ke posisi awal tata surya',
      },
      {
        keys: ['Esc'],
        label: 'Tutup panel info / batalkan fokus planet',
      },
      {
        keys: ['Tab'],
        label: 'Pindah fokus antar kontrol antarmuka secara berurutan',
      },
    ],
  },

  // POI & Panel Strings
  poi: {
    closePanel: 'Tutup panel titik minat',
    panelOpened: (name: string) => `Panel informasi ${name} dibuka.`,
    eyebrow: (type: string, parentName: string) => `${type} · ${parentName}`,
    needsVerification: 'Perlu verifikasi',
    tabs: {
      history: 'Sejarah',
      dimensions: 'Dimensi',
      terrain: 'Topografi 3D',
      atmosphere: 'Dinamika Atmosfer',
      sources: 'Sumber',
    },
    historySectionTitle: 'Latar Belakang & Pembentukan',
    dimensionsSectionTitle: 'Karakteristik & Pengukuran',
    comparisonTitle: 'Perbandingan Skala 3D',
    comparisonSubtitle: 'Visualisasi 3D dua objek dalam skala tinggi yang sama',
    everestLabel: 'Gunung Everest (Bumi)',
    everestHeight: '8.848 km',
    everestSource: 'USGS / Pemetaan Geodesi Nepal',
    olympusLabel: 'Olympus Mons (Mars)',
    olympusHeight: '~21.9 km (2.5× Everest)',
    olympusSource: 'NASA MOLA; Perlu verifikasi',
    earthLabel: 'Bumi (Diameter)',
    earthSize: '12.742 km',
    earthSource: 'NASA Planetary Fact Sheet',
    grsLabel: 'Badai Merah Raksasa (Jupiter)',
    grsSize: '~16.350 km (1.3× Bumi)',
    grsSource: 'NASA Juno / Hubble OPAL',
    terrainNoticeTitle: 'Model ilustrasi',
    terrainNoticeDesc:
      'Heightmap asli belum dipasang; bentuk permukaan dihasilkan secara prosedural dari parameter geologi POI.',
    terrainCanvasAria: (name: string) =>
      `Model topografi 3D interaktif ${name}`,
    verticalExaggeration: 'Pembesaran vertikal',
    wireframe: 'Kerangka kawat',
    elevationLegend: 'Legenda ketinggian',
    elevationLow: 'Rendah (Dataran)',
    elevationMid: 'Sedang (Lereng)',
    elevationHigh: 'Tinggi (Puncak/Kaldera)',
    scaleAxis: 'Sumbu skala vertikal ilustratif',
    atmosphereNoticeTitle: 'Struktur Atmosfer Tanpa Permukaan Padat',
    atmosphereNoticeDesc:
      'Objek ini berupa fenomena gas raksasa di atmosfer Jovian. Kedalaman pusaran mencapai 300-500 km ke dalam mantel gas hidrogen/helium.',
    particleCountLabel: 'Kepadatan partikel pusaran',
    windSpeedLabel: 'Kecepatan angin tepi badai',
    stormControls: {
      title: 'Kontrol Simulasi Partikel GPU',
      play: 'Putar Simulasi',
      pause: 'Jeda Simulasi',
      speed: 'Kecepatan Pusaran',
      density: 'Kepadatan Partikel',
      activeParticles: 'Jumlah Partikel Aktif',
      reducedMotionActive:
        'Mode kurangi animasi aktif (aliran diperlambat/statis)',
    },
    stormFormation: {
      title: 'Bagaimana Badai Ini Terbentuk?',
      subtitle: 'Dinamika Fisika Pusaran Antisiklonik Terbesar di Tata Surya',
      anticycloneTitle: 'Apa itu Antisiklon?',
      anticycloneDesc:
        'Badai Merah Raksasa adalah antisiklon—sistem cuaca bertekanan tinggi raksasa di mana gas naik di pusat dan berputar keluar. Di belahan selatan Jupiter (sekitar 22° Lintang Selatan), efek Coriolis membelokkan arah rotasi menjadi berlawanan arah jarum jam (counter-clockwise). Kecepatan angin di tepi pusaran (collar) mencapai lebih dari 430–680 km/jam, sedangkan pusat mata badai relatif lebih tenang.',
      anticycloneSource: 'NASA Science Planetary Atmospheres & Juno Mission',
      noSurfaceTitle: 'Mengapa Bertahan Ratusan Tahun Tanpa Permukaan Padat?',
      noSurfaceDesc:
        'Di Bumi, badai tropis dengan cepat kehilangan energinya saat melintasi daratan padat karena gesekan permukaan. Jupiter adalah planet raksasa gas tanpa daratan padat, sehingga tidak ada gesekan topografi untuk meredam pusaran. Selain itu, badai ini terjepit di antara dua aliran jet stream sabuk atmosfer yang berlawanan arah (Sabuk Khatulistiwa Selatan yang mengalir ke barat di sisi utara badai, dan Zona Tropis Selatan yang mengalir ke timur di sisi selatannya), yang terus menerus menyuplai momentum sudut dan energi pusaran bagaikan bantalan peluru raksasa.',
      noSurfaceSource: 'NASA Juno Science Findings & Jet Propulsion Laboratory',
      shrinkingTitle: 'Penyusutan Ukuran dari Abad ke Abad',
      shrinkingDesc:
        'Pengamatan teleskop Bumi pada akhir abad ke-19 mencatat diameter badai ini pernah mencapai sekitar 40.000 km—cukup besar untuk menampung tiga planet Bumi berdampingan. Pengukuran modern dari Teleskop Luar Angkasa Hubble (program OPAL) dan wahana Juno menunjukkan lebarnya kini menyusut menjadi sekitar 16.350 km (sekitar 1,3 kali diameter Bumi). Bentuknya juga berangsur-angsur menjadi lebih membulat dibandingkan bentuk elips sangat lonjong di masa lalu.',
      shrinkingSource:
        'NASA Goddard / Hubble Space Telescope Outer Planet Atmospheres Legacy (OPAL)',
      mysteriesTitle: 'Misteri yang Belum Terpecahkan (Perlu Verifikasi)',
      mysteryDepth:
        'Kedalaman Akar Badai: Instrumen Microwave Radiometer (MWR) wahana Juno membuktikan badai menembus setidaknya 300 hingga 500 km di bawah lapisan awan terluar, namun batas terbawah dan interaksinya dengan mantel hidrogen cair masih dalam penelitian aktif (Perlu verifikasi batas bawah).',
      mysteryColor:
        'Penyebab Warna Merah: Belum ada kepastian ilmiah mengapa warnanya merah menyala. Teori utama menduga radiasi ultraviolet matahari memecah amonia dan asetilena menjadi senyawa organik kompleks (kromofor), atau adanya senyawa fosfor dan belerang yang terangkat dari kedalaman (Perlu verifikasi reaksi kimia kromofor).',
      mysteryFuture:
        'Masa Depan Badai: Belum dapat dipastikan apakah tren penyusutan akan berlanjut hingga badai lenyap sepenuhnya, atau akan stabil pada ukuran kesetimbangan baru yang bertahan lama (Perlu verifikasi pemodelan iklim).',
    },
    sourcesTitle: 'Daftar Referensi & Sumber Ilmiah',
    licenseTitle: 'Lisensi & Atribusi Data',
    licenseContent:
      'Seluruh data geologi, dimensi, dan foto bersumber dari data terbuka sains publik NASA, USGS Astrogeology Science Center, dan Jet Propulsion Laboratory (JPL).',
    externalLinkNotice: 'Buka tautan sumber di tab baru',
  },

  // Autentikasi Supabase Auth & Profil Pengguna
  auth: {
    loginTitle: 'Masuk Observatorium',
    loginSubtitle:
      'Masuk untuk mengakses kelas, tur guru, dan progres jelajahmu.',
    registerTitle: 'Daftar Akun AstroSphere',
    registerSubtitle: 'Buat akun siswa untuk bergabung ke kelas astronomi.',
    forgotPasswordTitle: 'Lupa Kata Sandi',
    forgotPasswordSubtitle:
      'Masukkan email akunmu untuk menerima tautan pemulihan kata sandi.',
    emailLabel: 'Alamat Email',
    emailPlaceholder: 'nama@sekolah.id',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Minimal 8 karakter',
    nameLabel: 'Nama Lengkap',
    namePlaceholder: 'Nama siswa atau guru',
    schoolLabel: 'Asal Sekolah / Lembaga',
    schoolPlaceholder: 'Contoh: SMP Negeri 1 Merauke',
    loginButton: 'Masuk ke AstroSphere',
    registerButton: 'Daftar Sekarang (Peran Siswa)',
    forgotPasswordButton: 'Kirim Tautan Pemulihan',
    backToLogin: 'Kembali ke halaman masuk',
    noAccountYet: 'Belum punya akun?',
    registerLink: 'Daftar sebagai siswa',
    alreadyHaveAccount: 'Sudah memiliki akun?',
    loginLink: 'Masuk di sini',
    forgotPasswordLink: 'Lupa kata sandi?',
    logoutButton: 'Keluar Akun',
    deleteAccountBtn: 'Hapus Akun Saya',
    deleteAccountConfirm:
      'Apakah Anda yakin ingin menghapus akun dan semua progres jelajah? Tindakan ini tidak dapat dibatalkan sesuai hak penghapusan UU PDP.',
    accountDeleted: 'Akun dan seluruh data pribadi berhasil dihapus.',
    loginSuccess: 'Berhasil masuk ke AstroSphere!',
    registerSuccess: 'Pendaftaran berhasil! Akun siswa Anda telah aktif.',
    passwordResetSent: 'Tautan pemulihan telah dikirim ke email Anda.',
    demoAccountsTitle: 'Akun Demo Evaluasi:',
    demoStudent: 'Masuk sbg Siswa Demo',
    demoTeacher: 'Masuk sbg Guru Demo',
    demoAdmin: 'Masuk sbg Admin Demo',
    roles: {
      siswa: 'Siswa',
      guru: 'Guru',
      admin: 'Admin',
    },
    errors: {
      invalidCredentials: 'Email atau kata sandi tidak sesuai.',
      emailTaken: 'Alamat email ini sudah terdaftar.',
      weakPassword: 'Kata sandi harus minimal 8 karakter.',
      nameRequired: 'Nama lengkap wajib diisi.',
      emailRequired: 'Alamat email wajib diisi.',
      unauthorizedRole:
        'Akses ditolak: Anda tidak memiliki hak akses untuk halaman ini.',
    },
  },

  // Fitur Kelas (FR-07)
  classes: {
    title: 'Manajemen Kelas Astronomi',
    studentSectionTitle: 'Kelas yang Saya Ikuti',
    teacherSectionTitle: 'Kelas yang Saya Ajar',
    joinClassTitle: 'Gabung Kelas Baru',
    joinClassSubtitle:
      'Masukkan 6 karakter kode unik yang diberikan oleh gurumu.',
    joinCodeLabel: 'Kode Gabung Kelas (6 Karakter)',
    joinCodePlaceholder: 'MISAL: K7X8M2',
    joinButton: 'Gabung ke Kelas',
    createClassButton: 'Buat Kelas Baru',
    createClassTitle: 'Buat Kelas Astronomi Baru',
    classNameLabel: 'Nama Kelas / Rombel',
    classNamePlaceholder: 'Contoh: Astronomi Dasar 7A',
    gradeLevelLabel: 'Jenjang / Tingkat',
    gradeLevelPlaceholder: 'Contoh: SMP Kelas 7',
    saveClassButton: 'Simpan & Dapatkan Kode',
    cancelButton: 'Batal',
    copyCodeButton: 'Salin Kode',
    codeCopied: 'Kode Tersalin!',
    membersCount: (count: number) => `${count} Siswa Terdaftar`,
    membersTitle: 'Daftar Anggota Kelas:',
    noMembersYet: 'Belum ada siswa yang bergabung dengan kode ini.',
    noJoinedClasses:
      'Anda belum bergabung ke kelas mana pun. Masukkan kode kelas dari gurumu di atas.',
    noTeacherClasses:
      'Anda belum membuat kelas. Klik tombol di atas untuk membuat kelas pertama Anda.',
    leaveClassButton: 'Tinggalkan Kelas',
    leaveClassConfirm: 'Apakah Anda yakin ingin keluar dari kelas ini?',
    studentPrivacyNotice:
      'Privasi Terjaga: Alamat email siswa tidak pernah ditampilkan ke siswa lain.',
    teacherLabel: 'Guru Pengajar',
    joinedAt: 'Bergabung pada',
    errors: {
      invalidCode:
        'Kode kelas tidak valid atau tidak ditemukan. Pastikan 6 karakter sudah sesuai.',
      alreadyJoined: 'Anda sudah terdaftar di dalam kelas ini.',
      cannotJoinOwnClass:
        'Guru tidak dapat bergabung ke kelas yang diajarnya sendiri.',
      classNameRequired: 'Nama kelas wajib diisi.',
      gradeLevelRequired: 'Jenjang kelas wajib diisi.',
    },
  },

  // Kebijakan Privasi & UU PDP
  privacy: {
    title: 'Kebijakan Privasi & Perlindungan Data Anak',
    subtitle:
      'Komitmen AstroSphere terhadap transparansi data dan kepatuhan UU Pelindungan Data Pribadi No. 27 Tahun 2022',
    lastUpdated: 'Pembaruan terakhir: 1 November 2026',
    backToHome: 'Kembali ke Beranda',
  },

  // Fitur Tur Terpandu (FR-08)
  tours: {
    title: 'Tur Terpandu Edukasi',
    subtitle:
      'Jelajahi titik-titik minat astronomi dengan panduan narasi interaktif dan sudut pandang kamera sinematik.',
    builder: {
      title: 'Pembuat Tur Terpandu (Guru)',
      editTitle: 'Edit Tur Terpandu',
      subtitle:
        'Susun langkah narasi dan simpan sudut kamera 3D untuk siswa Anda.',
      tourTitleLabel: 'Judul Tur Edukasi',
      tourTitlePlaceholder:
        'Contoh: Ekspedisi Geologi Mars & Badai Raksasa Jupiter',
      descriptionLabel: 'Deskripsi Singkat Tur',
      descriptionPlaceholder:
        'Tuliskan tujuan pembelajaran dan pengantar singkat tur ini...',
      classesLabel: 'Bagikan ke Kelas Anda',
      classesHelp:
        'Pilih kelas-kelas siswa yang diizinkan mengakses tur ini setelah diterbitkan.',
      noClassesForTeacher:
        'Anda belum memiliki kelas aktif. Silakan buat kelas terlebih dahulu di menu Manajemen Kelas.',
      stepsSectionTitle: 'Urutan Langkah Eksplorasi (POI)',
      addStepButton: 'Tambah Langkah POI',
      selectPoiPlaceholder: '-- Pilih Titik Minat (POI) untuk ditambahkan --',
      stepHeader: (stepNo: number, poiName: string, bodyName: string) =>
        `Langkah ${stepNo}: ${poiName} (${bodyName})`,
      moveUp: 'Pindah ke atas (Alt+↑)',
      moveDown: 'Pindah ke bawah (Alt+↓)',
      deleteStep: 'Hapus langkah',
      narrationLabel: 'Teks Narasi Langkah',
      narrationPlaceholder:
        'Tuliskan penjelasan ilmiah yang mendidik dan mudah dipahami siswa...',
      durationLabel: 'Durasi Tampilan (Detik)',
      cameraPresetTitle: 'Sudut Kamera 3D Langkah Ini',
      saveCurrentCamera: 'Simpan Posisi Kamera Saat Ini',
      cameraSavedToast:
        'Koordinat dan sudut pandang kamera scene berhasil disimpan!',
      testCameraAngle: 'Uji Sudut Kamera Ini',
      cameraPositionLabel: 'Posisi Kamera',
      cameraTargetLabel: 'Titik Fokus (Target)',
      saveDraft: 'Simpan sebagai Draf',
      publish: 'Terbitkan Tur',
      unpublish: 'Kembalikan ke Draf',
      preview: 'Pratinjau Tur di Scene 3D',
      cancel: 'Batal',
      close: 'Tutup',
      noStepsYet:
        'Belum ada langkah POI. Pilih titik minat di atas lalu klik Tambah Langkah.',
      reorderAnnouncement: (from: number, to: number, name: string) =>
        `Langkah ${name} berhasil dipindahkan dari urutan ${from} ke urutan ${to}.`,
      stepDeletedAnnouncement: (name: string) =>
        `Langkah ${name} berhasil dihapus dari daftar tur.`,
    },
    player: {
      tourBadge: 'MODE TUR TERPANDU',
      previewBadge: 'MODE PRATINJAU GURU',
      stepCount: (current: number, total: number) =>
        `Langkah ${current} dari ${total}`,
      previous: 'Sebelumnya',
      next: 'Berikutnya',
      pause: 'Jeda',
      play: 'Lanjutkan',
      exit: 'Keluar Tur',
      autoAdvanceOn: 'Lanjut Otomatis: Aktif',
      autoAdvanceOff: 'Lanjut Otomatis: Manual',
      completedTitle: 'Tur Edukasi Selesai!',
      completedDesc:
        'Selamat! Anda telah menyelesaikan seluruh stasiun eksplorasi dalam tur terpandu ini. Seluruh progres titik minat telah tercatat.',
      restartTour: 'Ulangi Tur Dari Awal',
      backToExplore: 'Lanjut Eksplorasi Bebas',
      shortcutsHint:
        'Pintasan: Spasi (Jeda/Putar) · Panah Kanan (Berikutnya) · Panah Kiri (Sebelumnya) · Esc (Keluar)',
    },
    hub: {
      buttonLabel: 'Jelajahi Tur Terpandu',
      drawerTitle: 'Katalog Tur Terpandu Astronomi',
      availableTours: 'Tur Edukasi Tersedia',
      myTours: 'Tur Terpandu Saya (Guru)',
      createTourButton: 'Buat Tur Terpandu Baru',
      noToursAvailable:
        'Belum ada tur terpandu yang diterbitkan untuk kelas yang Anda ikuti.',
      noToursTeacher:
        'Anda belum memiliki tur terpandu. Klik tombol di atas untuk membuat tur pertama Anda.',
      startTour: 'Mulai Tur 3D',
      editTour: 'Edit Tur',
      deleteTour: 'Hapus',
      deleteConfirm:
        'Apakah Anda yakin ingin menghapus tur ini secara permanen?',
      statusDraft: 'Draf',
      statusPublished: 'Terbit',
      stepsCount: (count: number) => `${count} Langkah POI`,
      durationTotal: (seconds: number) =>
        `Durasi ±${Math.max(1, Math.ceil(seconds / 60))} menit (${seconds} dtk)`,
      authorLabel: 'Penyusun',
      assignedClasses: 'Kelas Terkait',
      allClasses: 'Semua Kelas Anda',
      allToursTab: 'Semua Tur',
      myClassesTab: 'Tur Kelas Saya',
    },
  },

  // Fitur Progres Belajar (FR-09)
  progress: {
    myExplorationsTitle: 'Jelajahku',
    myExplorationsSubtitle:
      'Catatan observasi titik minat (POI) dan capaian belajarmu di Tata Surya.',
    exploredSummary: (explored: number, total: number, pct: number) =>
      `${explored} dari ${total} Titik Minat (${pct}%) telah dijelajahi`,
    visitedBadge: 'Sudah Dikunjungi',
    unvisitedBadge: 'Belum Dikunjungi',
    timeSpent: (sec: number) =>
      sec < 60 ? `${sec} detik` : `${Math.floor(sec / 60)}m ${sec % 60}s`,
    lastVisited: 'Terakhir dikunjungi',
    exploreNow: 'Kunjungi Sekarang',
    quizScoreBadge: (score: number, max: number) => `Kuis: ${score}/${max}`,
    noQuizYet: 'Kuis belum dikerjakan',
    classDashboardTitle: 'Dasbor Progres Belajar Kelas',
    classDashboardDesc:
      'Pantau keterlibatan siswa secara menyeluruh dan temukan materi yang memerlukan pendalaman lebih lanjut tanpa membandingkan siswa secara mencolok.',
    mostOpenedPoi: 'POI Paling Banyak Dibuka',
    leastOpenedPoi: 'POI Paling Sedikit Dibuka',
    avgTimePerPoi: 'Rata-rata Waktu Eksplorasi',
    avgQuizScore: 'Rata-rata Skor Kuis Kelas',
    studentTableTitle: 'Keterlibatan Siswa per Akun',
    colStudent: 'Nama Siswa',
    colSchool: 'Sekolah',
    colVisited: 'POI Dikunjungi',
    colTime: 'Total Waktu',
    colQuiz: 'Skor Kuis Rata-rata',
    colLastActive: 'Aktivitas Terakhir',
    noData: 'Belum ada data progres untuk kelas ini.',
  },

  // Fitur Kuis Interaktif (FR-10)
  quiz: {
    tabLabel: 'Kuis Cepat',
    ctaBannerTitle: 'Uji Pemahaman Astronomimu!',
    ctaBannerDesc:
      'Jawab kuis singkat pilihan ganda berdasarkan data sains yang baru saja kamu pelajari.',
    startQuizBtn: 'Mulai Kuis Cepat',
    questionCount: (current: number, total: number) =>
      `Pertanyaan ${current} dari ${total}`,
    submitAnswer: 'Pilih Jawaban',
    nextQuestion: 'Soal Berikutnya',
    seeResults: 'Lihat Hasil Akhir',
    explanationTitle: 'Penjelasan Ilmiah:',
    correctFeedback: 'Jawaban Benar!',
    incorrectFeedback: 'Jawaban Belum Tepat.',
    scoreTitle: 'Hasil Kuis Astronomi',
    scoreSummary: (score: number, max: number, pct: number) =>
      `Skor Anda: ${score} dari ${max} (${pct}%)`,
    retryQuiz: 'Ulangi Kuis',
    closeQuiz: 'Selesai & Tutup',
    manageQuestions: 'Kelola Soal Kuis',
    manageTitle: 'Manajemen Soal Kuis POI (Guru & Admin)',
    addQuestionBtn: 'Tambah Soal Baru',
    saveQuestion: 'Simpan Soal',
    deleteQuestion: 'Hapus Soal',
    questionTextLabel: 'Teks Pertanyaan',
    optionsLabel: 'Pilihan Jawaban',
    correctOptionLabel: 'Jawaban yang Benar',
    explanationLabel: 'Penjelasan Ilmiah (Umpan Balik)',
  },

  // Fitur Metrik Sesi & KPI Target 30 FPS (FR-12)
  metrics: {
    adminTitle: 'Metrik Performa & KPI Sistem',
    adminSubtitle:
      'Pemantauan kepatuhan target FPS 30 (FR-12) dan metrik operasional tanpa melacak data pribadi (kepatuhan UU PDP).',
    targetFpsKpiTitle: 'Kepatuhan Target Minimal 30 FPS (FR-12)',
    targetFpsKpiDesc:
      'Persentase sesi penjelajahan yang berhasil mempertahankan performa rata-rata minimal 30 FPS.',
    totalSessions: 'Total Sesi Eksplorasi',
    avgFpsOverall: 'Rata-rata FPS Global',
    qualityDistribution: 'Distribusi Kualitas Visual',
    avgDuration: 'Rata-rata Durasi Sesi',
    privacyStatement:
      'Privasi Terjamin (UU PDP): Sistem hanya mencatat durasi anonim, rata-rata FPS, dan tingkat kualitas teknis tanpa merekam alamat IP, fingerprint browser, atau informasi pribadi.',
    viewMetricsBtn: 'Dasbor KPI Metrik 30 FPS',
  },

  // Fitur CMS Admin Observatorium (FR-11)
  cms: {
    title: 'Manajemen Konten Astronomi (CMS)',
    subtitle:
      'Kelola katalog benda langit, titik minat (POI), aset 3D, dan tinjau pratinjau sebelum publikasi.',
    badge: 'Admin Konten',
    tabs: {
      bodies: 'Benda Langit',
      pois: 'Titik Minat (POI)',
      assets: 'Aset 3D & Media',
      history: 'Riwayat Perubahan',
    },
    actions: {
      createBody: 'Tambah Benda Langit',
      editBody: 'Ubah Benda Langit',
      deleteBody: 'Hapus Benda Langit',
      createPoi: 'Tambah POI Baru',
      editPoi: 'Ubah POI',
      deletePoi: 'Hapus POI',
      uploadAsset: 'Unggah Aset 3D',
      deleteAsset: 'Hapus Aset',
      previewStudent: 'Pratinjau Siswa',
      saveDraft: 'Simpan sebagai Draf',
      publishNow: 'Terbitkan Sekarang',
      unpublish: 'Jadikan Draf',
      cancel: 'Batal',
      save: 'Simpan Data',
      upload: 'Unggah Berkas',
      filterAll: 'Semua Status',
      searchPlaceholder: 'Cari berdasarkan nama atau slug...',
    },
    status: {
      published: 'Terbit',
      draft: 'Draf',
    },
    labels: {
      name: 'Nama Objek',
      slug: 'Slug Unik (URL)',
      type: 'Tipe Objek',
      parentId: 'Objek Induk (untuk Bulan/Satelit)',
      diameterKm: 'Diameter (km)',
      massKg: 'Massa (kg)',
      rotationPeriodH: 'Periode Rotasi (jam)',
      axialTiltDeg: 'Kemiringan Sumbu (derajat)',
      semiMajorAxisAu: 'Sumbu Semi-Mayor (AU)',
      eccentricity: 'Eksentrisitas Orbit (0 - 1)',
      inclinationDeg: 'Inklinasi Orbit (derajat)',
      orbitPeriodDays: 'Periode Orbit (hari)',
      description: 'Deskripsi Edukasi',
      historyText: 'Teks Sejarah & Pembentukan',
      latitude: 'Garis Lintang (Latitude: -90° s.d. 90°)',
      longitude: 'Garis Bujur (Longitude: 0° s.d. 360°)',
      sources: 'Daftar Sumber Terverifikasi (Wajib)',
      sourcePlaceholder:
        'Contoh: NASA Planetary Data System / JPL Photojournal',
      dimensions: 'Dimensi & Ukuran Terukur',
      addDimension: '+ Tambah Parameter Dimensi',
      addSource: '+ Tambah Sumber Ilmiah',
      dimensionLabel: 'Label Parameter',
      dimensionValue: 'Nilai',
      dimensionUnit: 'Satuan',
      dimensionSource: 'Sumber Fakta',
      targetObject: 'Target Asosiasi',
      assetType: 'Tipe Aset',
      qualityTier: 'Tingkat Kualitas',
      license: 'Lisensi Hak Cipta (Wajib)',
      attribution: 'Atribusi Pencipta / Lembaga (Wajib)',
      version: 'Versi Aset',
      fileSize: 'Ukuran Berkas',
      fileType: 'Format / MIME Type',
      dropzoneText: 'Klik atau seret berkas ke area ini untuk mengunggah',
      fileHint:
        'Tekstur: JPG/PNG/WebP (maks 10MB) | Model: GLB/glTF (maks 20MB) | Terrain: PNG/JPG (maks 10MB)',
      autoVersionNotice:
        'Nomor versi akan dinaikkan otomatis dari versi terakhir yang terdaftar.',
      visualPickerHelp:
        'Penentu Koordinat Visual: Klik pada permukaan bola 3D planet untuk mengisi koordinat lintang & bujur secara otomatis.',
      previewNotice:
        'Pratinjau Hasil Akhir: Tampilan di bawah ini identik 100% dengan apa yang dilihat siswa saat menjelajah tata surya.',
      sourcesRequiredNotice:
        'Akurasi Konten: Setiap fakta numerik wajib memiliki sumber ilmiah terbuka yang dapat diverifikasi (NASA/USGS/IAU).',
    },
    history: {
      title: 'Riwayat Audit Perubahan Konten',
      subtitle:
        'Catatan aktivitas administrasi konten untuk akuntabilitas dan transparansi sistem.',
      colTime: 'Waktu Perubahan',
      colUser: 'Admin Pelaku',
      colAction: 'Aksi',
      colEntity: 'Entitas',
      colName: 'Nama Objek',
      colDetails: 'Detail Perubahan',
      noHistory: 'Belum ada riwayat aktivitas perubahan konten.',
    },
    validation: {
      nameRequired: 'Nama objek minimal 2 karakter.',
      slugRequired:
        'Slug harus berupa huruf kecil, angka, atau tanda hubung (-).',
      sourceRequired: 'Minimal 1 sumber ilmiah terverifikasi wajib disertakan.',
      dimensionSourceRequired: 'Sumber fakta untuk setiap dimensi wajib diisi.',
      historyRequired: 'Teks sejarah minimal 20 karakter penjelasan ilmiah.',
      latRange: 'Garis lintang harus berada di antara -90 dan 90 derajat.',
      lonRange: 'Garis bujur harus berada di antara 0 dan 360 derajat.',
      licenseRequired:
        'Lisensi hak cipta wajib dicantumkan (contoh: Domain Publik NASA).',
      attributionRequired:
        'Atribusi pencipta wajib dicantumkan (contoh: NASA/JPL-Caltech).',
      fileRequired: 'Berkas aset wajib dipilih.',
      fileTooLarge: (maxMb: number) =>
        `Ukuran berkas melebihi batas maksimal ${maxMb}MB.`,
      invalidFileType: (allowed: string) =>
        `Format berkas tidak didukung. Format yang diizinkan: ${allowed}.`,
      unauthorizedWrite:
        'Akses ditolak: Hanya pengguna dengan peran admin yang berhak mengubah konten.',
    },
  },

  // Tentang Aplikasi & Kredit Aset
  about: {
    buttonLabel: 'Tentang AstroSphere dan Kredit Aset',
    title: 'Tentang AstroSphere & Kredit Aset',
    subtitle:
      'Platform visualisasi 3D tata surya interaktif real-time di browser untuk pendidikan astronomi di Indonesia.',
    closeLabel: 'Tutup informasi tentang aplikasi',
    missionTitle: 'Tujuan & Visi Edukasi',
    missionDesc:
      'AstroSphere dirancang untuk membantu siswa dan guru di seluruh penjuru Indonesia menjelajahi keajaiban tata surya secara spasial 3D interaktif. Aplikasi ini dibangun dengan standar aksesibilitas penuh (WCAG AA), mode hemat performa untuk laptop sekolah, dan ketahanan offline untuk koneksi terbatas.',
    assetsTitle: 'Atribusi Lisensi Aset & Data Sains',
    assetsSubtitle:
      'Semua materi visual dan numerik menggunakan lisensi terbuka atau domain publik dengan kepatuhan hak cipta:',
    techTitle: 'Teknologi & Pustaka Terbuka',
    privacyTitle: 'Pelindungan Data Pribadi',
    privacyDesc:
      'AstroSphere mematuhi amanat UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Kami tidak menjual data, tidak menyisipkan iklan komersial, dan menyaring semua data pribadi anak di bawah umur.',
    viewPrivacyPolicy: 'Baca Kebijakan Privasi Lengkap',
  },
} as const;
