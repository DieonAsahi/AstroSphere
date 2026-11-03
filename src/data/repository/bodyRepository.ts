import { jsonBodyRepository } from './jsonRepository';
import { supabaseBodyRepository } from './supabaseRepository';
import type { BodyRepository } from './types';

const useSupabase = import.meta.env.VITE_DATA_SOURCE === 'supabase';

export const bodyRepository: BodyRepository = useSupabase
  ? supabaseBodyRepository
  : jsonBodyRepository;

export { jsonBodyRepository, supabaseBodyRepository };
export type { BodyRepository } from './types';
