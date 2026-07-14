import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

export type SupabaseRuntimeConfig = {
  supabaseUrl: string;
  supabaseKey: string;
};

function getEnvConfig(): SupabaseRuntimeConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return { supabaseUrl, supabaseKey };
}

export const isSupabaseConfigured = Boolean(getEnvConfig());

let supabaseClient: SupabaseClient | null = null;
let supabaseClientCacheKey = '';

export function hasSupabaseConfig(
  config: SupabaseRuntimeConfig | null | undefined,
) {
  return Boolean(config?.supabaseUrl && config.supabaseKey);
}

export async function loadSupabaseConfig(): Promise<SupabaseRuntimeConfig | null> {
  const envConfig = getEnvConfig();

  if (envConfig) {
    return envConfig;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const response = await fetch('/api/config', { cache: 'no-store' });

  if (!response.ok) {
    return null;
  }

  const config = (await response.json()) as Partial<SupabaseRuntimeConfig>;

  if (!config.supabaseUrl || !config.supabaseKey) {
    return null;
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  };
}

export function createClient(
  config: SupabaseRuntimeConfig | null = getEnvConfig(),
): SupabaseClient | null {
  if (!config?.supabaseUrl || !config.supabaseKey) {
    return null;
  }

  const cacheKey = `${config.supabaseUrl}:${config.supabaseKey}`;

  if (!supabaseClient || supabaseClientCacheKey !== cacheKey) {
    supabaseClient = createSupabaseClient(config.supabaseUrl, config.supabaseKey);
    supabaseClientCacheKey = cacheKey;
  }

  return supabaseClient;
}
