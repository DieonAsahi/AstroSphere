/**
 * AstroSphere (Edu Planet 3D) - TypeScript Database Definitions
 * Sesuai skema database Supabase PostgreSQL di supabase/structure.sql (PRD v1.3 Tahap 1)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanetSlug =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type PlanetCategory = 'TERRESTRIAL' | 'GAS_GIANT' | 'ICE_GIANT';

export type PoiCategory = 'SURFACE_LANDING' | 'ORBITAL_FLYBY' | 'OBSERVATION';

export type AnimationType =
  | 'SOLAR_ECLIPSE'
  | 'LUNAR_ECLIPSE'
  | 'MOON_PHASES'
  | 'GALILEAN_TRANSIT'
  | 'CUSTOM_ALIGNMENT';

export type ShipId = 'astra-scout' | 'orion-glider' | 'nova-voyager';

export type VisualConfig = {
  secondaryObjects?: string[];
  showUmbraPenumbra?: boolean;
  durationSeconds?: number;
  cameraZoomDistance?: number;
  educationalSteps?: string[];
  durasi_detik?: number;
  jarak_kamera?: number;
  posisi_kamera?: [number, number, number];
  target_kamera?: [number, number, number];
  objek_sekunder?: Array<{
    id: string;
    nama: string;
    radius?: number;
    orbit_distance?: number;
    color?: string;
  }>;
  shadow_params?: {
    umbra_radius?: number;
    penumbra_radius?: number;
    opacity?: number;
  };
  [key: string]: unknown;
};

export type AdminUser = {
  email: string;
  user_id?: string | null;
  created_at?: string;
};

export type Planet = {
  planet_id: string;
  urutan_orbit: number;
  nama: string;
  kategori_planet?: PlanetCategory;
  diameter_km: number;
  rotation_period_hours: number;
  orbital_period_days: number;
  axial_tilt_deg: number;
  deskripsi_materi: string;
  ringkasan_cepat?: string;
  sumber_referensi?: string | null;
  aset_model_url: string;
  tekstur_url?: string | null;
  warna_atmosfer_hex?: string;
  skala_visual: number;
  batas_zona_radius: number;
  kecepatan_jelajah_nyaman?: number;
  is_active?: boolean;
  updated_at: string;
};

export type HistoryEvent = {
  event_id: string;
  planet_id: string;
  era_label?: string;
  tahun_kejadian: number;
  kategori_poi?: PoiCategory;
  judul: string;
  deskripsi: string;
  gambar_url?: string | null;
  koordinat_lat?: number | null;
  koordinat_lng?: number | null;
  nama_wahana: string | null;
  sumber_referensi?: string | null;
  created_at: string;
};

export type Phenomenon = {
  phenomenon_id: string;
  planet_id: string;
  judul: string;
  tombol_aksi_label?: string;
  tipe_animasi: AnimationType;
  deskripsi_edukatif: string;
  konfigurasi_visual: VisualConfig;
  is_active?: boolean;
  created_at: string;
};

export type Question = {
  question_id: string;
  planet_id: string;
  soal: string;
  opsi: [string, string, string, string] | string[];
  kunci_jawaban: number;
  pembahasan_edukatif: string;
  bobot_poin: number;
  created_at: string;
};

export type Ship = {
  ship_id: string;
  urutan_tier: number;
  nama: string;
  panjang_meter: number;
  harga_poin: number;
  kecepatan_bonus_multiplier: number;
  aset_model_url: string;
  deskripsi: string;
};

export type PlayerProgress = {
  player_id: string;
  username: string;
  password_hash?: string;
  skor_kuis: Record<string, number>;
  saldo_poin: number;
  kepemilikan_pesawat: string[];
  pesawat_aktif: string;
  checkpoint_planet_id: string;
  created_at?: string;
  updated_at: string;
  // Backward compatibility fields
  user_id?: string;
  display_name?: string | null;
  email?: string | null;
};

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      planets: {
        Row: {
          planet_id: string;
          urutan_orbit: number;
          nama: string;
          kategori_planet: PlanetCategory;
          diameter_km: number;
          rotation_period_hours: number;
          orbital_period_days: number;
          axial_tilt_deg: number;
          deskripsi_materi: string;
          ringkasan_cepat: string;
          sumber_referensi: string | null;
          aset_model_url: string;
          tekstur_url: string | null;
          warna_atmosfer_hex: string;
          skala_visual: number;
          batas_zona_radius: number;
          kecepatan_jelajah_nyaman: number;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          planet_id: string;
          urutan_orbit: number;
          nama: string;
          kategori_planet?: PlanetCategory;
          diameter_km: number;
          rotation_period_hours: number;
          orbital_period_days: number;
          axial_tilt_deg?: number;
          deskripsi_materi: string;
          ringkasan_cepat?: string;
          sumber_referensi?: string | null;
          aset_model_url: string;
          tekstur_url?: string | null;
          warna_atmosfer_hex?: string;
          skala_visual?: number;
          batas_zona_radius?: number;
          kecepatan_jelajah_nyaman?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          planet_id?: string;
          urutan_orbit?: number;
          nama?: string;
          kategori_planet?: PlanetCategory;
          diameter_km?: number;
          rotation_period_hours?: number;
          orbital_period_days?: number;
          axial_tilt_deg?: number;
          deskripsi_materi?: string;
          ringkasan_cepat?: string;
          sumber_referensi?: string | null;
          aset_model_url?: string;
          tekstur_url?: string | null;
          warna_atmosfer_hex?: string;
          skala_visual?: number;
          batas_zona_radius?: number;
          kecepatan_jelajah_nyaman?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      history_events: {
        Row: {
          event_id: string;
          planet_id: string;
          era_label: string;
          tahun_kejadian: number;
          kategori_poi: PoiCategory;
          judul: string;
          deskripsi: string;
          gambar_url: string | null;
          koordinat_lat: number | null;
          koordinat_lng: number | null;
          nama_wahana: string | null;
          sumber_referensi: string | null;
          created_at: string;
        };
        Insert: {
          event_id?: string;
          planet_id: string;
          era_label?: string;
          tahun_kejadian: number;
          kategori_poi?: PoiCategory;
          judul: string;
          deskripsi: string;
          gambar_url?: string | null;
          koordinat_lat?: number | null;
          koordinat_lng?: number | null;
          nama_wahana?: string | null;
          sumber_referensi?: string | null;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          planet_id?: string;
          era_label?: string;
          tahun_kejadian?: number;
          kategori_poi?: PoiCategory;
          judul?: string;
          deskripsi?: string;
          gambar_url?: string | null;
          koordinat_lat?: number | null;
          koordinat_lng?: number | null;
          nama_wahana?: string | null;
          sumber_referensi?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      phenomena: {
        Row: {
          phenomenon_id: string;
          planet_id: string;
          judul: string;
          tombol_aksi_label: string;
          tipe_animasi: AnimationType;
          deskripsi_edukatif: string;
          konfigurasi_visual: VisualConfig;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          phenomenon_id?: string;
          planet_id: string;
          judul: string;
          tombol_aksi_label?: string;
          tipe_animasi: AnimationType;
          deskripsi_edukatif: string;
          konfigurasi_visual?: VisualConfig;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          phenomenon_id?: string;
          planet_id?: string;
          judul?: string;
          tombol_aksi_label?: string;
          tipe_animasi?: AnimationType;
          deskripsi_edukatif?: string;
          konfigurasi_visual?: VisualConfig;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          question_id: string;
          planet_id: string;
          soal: string;
          opsi: Json;
          kunci_jawaban: number;
          pembahasan_edukatif: string;
          bobot_poin: number;
          created_at: string;
        };
        Insert: {
          question_id?: string;
          planet_id: string;
          soal: string;
          opsi: Json;
          kunci_jawaban: number;
          pembahasan_edukatif: string;
          bobot_poin?: number;
          created_at?: string;
        };
        Update: {
          question_id?: string;
          planet_id?: string;
          soal?: string;
          opsi?: Json;
          kunci_jawaban?: number;
          pembahasan_edukatif?: string;
          bobot_poin?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ships: {
        Row: {
          ship_id: string;
          urutan_tier: number;
          nama: string;
          panjang_meter: number;
          harga_poin: number;
          kecepatan_bonus_multiplier: number;
          aset_model_url: string;
          deskripsi: string;
        };
        Insert: {
          ship_id: string;
          urutan_tier?: number;
          nama: string;
          panjang_meter: number;
          harga_poin: number;
          kecepatan_bonus_multiplier?: number;
          aset_model_url: string;
          deskripsi: string;
        };
        Update: {
          ship_id?: string;
          urutan_tier?: number;
          nama?: string;
          panjang_meter?: number;
          harga_poin?: number;
          kecepatan_bonus_multiplier?: number;
          aset_model_url?: string;
          deskripsi?: string;
        };
        Relationships: [];
      };
      player_progress: {
        Row: {
          player_id: string;
          username: string;
          password_hash: string;
          skor_kuis: Json;
          saldo_poin: number;
          kepemilikan_pesawat: string[];
          pesawat_aktif: string;
          checkpoint_planet_id: string;
          created_at: string;
          updated_at: string;
          // Backward compatibility
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
        };
        Insert: {
          player_id?: string;
          username: string;
          password_hash: string;
          skor_kuis?: Json;
          saldo_poin?: number;
          kepemilikan_pesawat?: string[];
          pesawat_aktif?: string;
          checkpoint_planet_id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
        };
        Update: {
          player_id?: string;
          username?: string;
          password_hash?: string;
          skor_kuis?: Json;
          saldo_poin?: number;
          kepemilikan_pesawat?: string[];
          pesawat_aktif?: string;
          checkpoint_planet_id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "player_progress_checkpoint_planet_id_fkey";
            columns: ["checkpoint_planet_id"];
            isOneToOne: false;
            referencedRelation: "planets";
            referencedColumns: ["planet_id"];
          },
          {
            foreignKeyName: "player_progress_pesawat_aktif_fkey";
            columns: ["pesawat_aktif"];
            isOneToOne: false;
            referencedRelation: "ships";
            referencedColumns: ["ship_id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      register_player_cloud: {
        Args: {
          p_username: string;
          p_password: string;
          p_scores: Json;
          p_ships: string[];
          p_active_ship: string;
          p_checkpoint: string;
        };
        Returns: {
          success: boolean;
          message?: string;
          player?: {
            player_id: string;
            username: string;
            saldo_poin: number;
            kepemilikan_pesawat: string[];
            pesawat_aktif: string;
            checkpoint_planet_id: string;
            skor_kuis: Json;
          };
        };
      };
      login_and_merge_player_cloud: {
        Args: {
          p_username: string;
          p_password: string;
          p_local_scores: Json;
          p_local_ships: string[];
          p_active_ship: string;
          p_checkpoint: string;
        };
        Returns: {
          success: boolean;
          message?: string;
          player?: {
            player_id: string;
            username: string;
            saldo_poin: number;
            kepemilikan_pesawat: string[];
            pesawat_aktif: string;
            checkpoint_planet_id: string;
            skor_kuis: Json;
          };
        };
      };
      admin_reset_player_password: {
        Args: {
          p_player_id: string;
          p_new_password: string;
        };
        Returns: boolean;
      };
      merge_guest_progress: {
        Args: {
          p_guest_scores: Json;
          p_guest_ships: string[];
          p_active_ship: string;
          p_checkpoint: string;
        };
        Returns: {
          success: boolean;
          saldo_poin: number;
          kepemilikan_pesawat: string[];
          pesawat_aktif: string;
          checkpoint_planet_id: string;
          skor_kuis?: Json;
        };
      };
    };
    Enums: {
      planet_category: PlanetCategory;
      poi_category: PoiCategory;
      animation_type: AnimationType;
    };
  };
};
