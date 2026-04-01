// Allowed origins for CORS – production, preview, and local dev
const ALLOWED_ORIGINS = [
  "https://shiftdash.lovable.app",
  "https://a691a375-f349-4362-b9c0-1fdd879ba929.lovableproject.com",
  "https://id-preview--a691a375-f349-4362-b9c0-1fdd879ba929.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Vary": "Origin",
  };
}
