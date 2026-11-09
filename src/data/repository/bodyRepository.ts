import { jsonBodyRepository } from './jsonRepository';
import { supabaseBodyRepository } from './supabaseRepository';
import type { BodyRepository } from './types';

const dataSource =
  import.meta.env.DATA_SOURCE || import.meta.env.VITE_DATA_SOURCE;
const useSupabase = dataSource === 'supabase';

export const bodyRepository: BodyRepository = useSupabase
  ? supabaseBodyRepository
  : jsonBodyRepository;

export { jsonBodyRepository, supabaseBodyRepository };
export type { BodyRepository } from './types';
