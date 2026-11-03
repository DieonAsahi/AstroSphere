import { jsonPoiRepository } from './jsonRepository';
import { supabasePoiRepository } from './supabaseRepository';
import type { PoiRepository } from './types';

const useSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase';

export const poiRepository: PoiRepository = useSupabase
  ? supabasePoiRepository
  : jsonPoiRepository;

export { jsonPoiRepository, supabasePoiRepository };
export type { PoiRepository } from './types';
