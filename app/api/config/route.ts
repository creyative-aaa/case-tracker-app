export const dynamic = 'force-dynamic';

export async function GET() {
  const cloudflareEnv = await getCloudflareEnv();
  const supabaseUrl =
    cloudflareEnv.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    cloudflareEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    cloudflareEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Response.json({
    supabaseUrl: supabaseUrl ?? '',
    supabaseKey: supabaseKey ?? '',
  });
}

async function getCloudflareEnv() {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });

    return env as Record<string, string | undefined>;
  } catch {
    return {};
  }
}
