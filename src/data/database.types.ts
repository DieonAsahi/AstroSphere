/**
 * Definisi Tipe TypeScript Skema Database Supabase PostgreSQL untuk AstroSphere.
 * Dihasilkan dari supabase/migrations/20261101000000_initial_schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'siswa' | 'guru' | 'admin';
export type CelestialBodyType = 'star' | 'planet' | 'dwarf_planet' | 'moon';
export type PoiType = 'gunung' | 'badai' | 'kawah' | 'lembah' | 'lainnya';
export type AssetType = 'tekstur' | 'model' | 'terrain' | 'partikel';
export type QualityTier = 'rendah' | 'sedang' | 'tinggi';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: UserRole;
          school_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role?: UserRole;
          school_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: UserRole;
          school_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      celestial_bodies: {
        Row: {
          id: string;
          slug: string;
          name: string;
          type: CelestialBodyType;
          parent_id: string | null;
          diameter_km: number | null;
          mass_kg: number | null;
          rotation_period_h: number | null;
          axial_tilt_deg: number | null;
          semi_major_axis_au: number | null;
          eccentricity: number | null;
          inclination_deg: number | null;
          orbit_period_days: number | null;
          description: string | null;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          type: CelestialBodyType;
          parent_id?: string | null;
          diameter_km?: number | null;
          mass_kg?: number | null;
          rotation_period_h?: number | null;
          axial_tilt_deg?: number | null;
          semi_major_axis_au?: number | null;
          eccentricity?: number | null;
          inclination_deg?: number | null;
          orbit_period_days?: number | null;
          description?: string | null;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          type?: CelestialBodyType;
          parent_id?: string | null;
          diameter_km?: number | null;
          mass_kg?: number | null;
          rotation_period_h?: number | null;
          axial_tilt_deg?: number | null;
          semi_major_axis_au?: number | null;
          eccentricity?: number | null;
          inclination_deg?: number | null;
          orbit_period_days?: number | null;
          description?: string | null;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      points_of_interest: {
        Row: {
          id: string;
          body_id: string;
          slug: string;
          name: string;
          type: PoiType;
          lat: number;
          lon: number;
          history_text: string;
          dimensions: Json;
          particle_config: Json | null;
          sources: Json;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          body_id: string;
          slug: string;
          name: string;
          type: PoiType;
          lat: number;
          lon: number;
          history_text: string;
          dimensions?: Json;
          particle_config?: Json | null;
          sources?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          body_id?: string;
          slug?: string;
          name?: string;
          type?: PoiType;
          lat?: number;
          lon?: number;
          history_text?: string;
          dimensions?: Json;
          particle_config?: Json | null;
          sources?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          body_id: string | null;
          poi_id: string | null;
          asset_type: AssetType;
          quality_tier: QualityTier;
          file_url: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          license: string | null;
          attribution: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          body_id?: string | null;
          poi_id?: string | null;
          asset_type: AssetType;
          quality_tier?: QualityTier;
          file_url: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          license?: string | null;
          attribution?: string | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          body_id?: string | null;
          poi_id?: string | null;
          asset_type?: AssetType;
          quality_tier?: QualityTier;
          file_url?: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          license?: string | null;
          attribution?: string | null;
          version?: number;
          created_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          teacher_id: string;
          name: string;
          grade_level: string;
          join_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          name: string;
          grade_level: string;
          join_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          name?: string;
          grade_level?: string;
          join_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      class_members: {
        Row: {
          class_id: string;
          student_id: string;
          joined_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          joined_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          joined_at?: string;
        };
      };
      guided_tours: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tour_classes: {
        Row: {
          tour_id: string;
          class_id: string;
          created_at: string;
        };
        Insert: {
          tour_id: string;
          class_id: string;
          created_at?: string;
        };
        Update: {
          tour_id?: string;
          class_id?: string;
          created_at?: string;
        };
      };
      tour_steps: {
        Row: {
          id: string;
          tour_id: string;
          poi_id: string;
          step_no: number;
          narration_text: string;
          camera_preset: Json;
          duration_s: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tour_id: string;
          poi_id: string;
          step_no: number;
          narration_text: string;
          camera_preset: Json;
          duration_s?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tour_id?: string;
          poi_id?: string;
          step_no?: number;
          narration_text?: string;
          camera_preset?: Json;
          duration_s?: number;
          created_at?: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          poi_id: string;
          viewed_at: string;
          time_spent_sec: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          poi_id: string;
          viewed_at?: string;
          time_spent_sec?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          poi_id?: string;
          viewed_at?: string;
          time_spent_sec?: number;
        };
      };
      quizzes: {
        Row: {
          id: string;
          poi_id: string;
          title: string;
          description: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          poi_id: string;
          title: string;
          description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          poi_id?: string;
          title?: string;
          description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          options: Json;
          correct_option_id: string;
          explanation: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_text: string;
          options: Json;
          correct_option_id: string;
          explanation?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_text?: string;
          options?: Json;
          correct_option_id?: string;
          explanation?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          score: number;
          max_score: number;
          answers: Json | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          score: number;
          max_score: number;
          answers?: Json | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          user_id?: string;
          score?: number;
          max_score?: number;
          answers?: Json | null;
          completed_at?: string;
        };
      };
      session_metrics: {
        Row: {
          id: string;
          user_id: string | null;
          started_at: string;
          duration_sec: number;
          pois_opened: number;
          avg_fps: number | null;
          quality_tier: QualityTier | null;
          device_class: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          started_at?: string;
          duration_sec: number;
          pois_opened?: number;
          avg_fps?: number | null;
          quality_tier?: QualityTier | null;
          device_class?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          started_at?: string;
          duration_sec?: number;
          pois_opened?: number;
          avg_fps?: number | null;
          quality_tier?: QualityTier | null;
          device_class?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
