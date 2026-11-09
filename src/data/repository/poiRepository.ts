import { jsonPoiRepository } from './jsonRepository';
import { supabasePoiRepository } from './supabaseRepository';
import type { PoiRepository } from './types';

const dataSource =
  import.meta.env.DATA_SOURCE || import.meta.env.VITE_DATA_SOURCE;
const useSupabase = dataSource === 'supabase';

export const poiRepository: PoiRepository = useSupabase
  ? supabasePoiRepository
  : jsonPoiRepository;

export { jsonPoiRepository, supabasePoiRepository };
export type { PoiRepository } from './types';
