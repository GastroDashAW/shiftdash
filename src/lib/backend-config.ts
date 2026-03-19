const PUBLIC_ENV_FALLBACKS = {
  VITE_SUPABASE_URL: 'https://irgtersdrvgusiqeqwsy.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZ3RlcnNkcnZndXNpcWVxd3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDIzMDQsImV4cCI6MjA4ODIxODMwNH0.2_X8unnM77Mp7D7G7frOd3-L6MbBU-U6Q4SkoG3FevE',
} as const;

type PublicEnvKey = keyof typeof PUBLIC_ENV_FALLBACKS;

function resolvePublicEnv(key: PublicEnvKey) {
  const envValue = import.meta.env[key];

  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return envValue;
  }

  if (import.meta.env.DEV) {
    console.warn(`[backend-config] Missing ${key}, using public fallback.`);
  }

  return PUBLIC_ENV_FALLBACKS[key];
}

export const backendUrl = resolvePublicEnv('VITE_SUPABASE_URL');
export const backendPublishableKey = resolvePublicEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
