export function getAuthRedirectUrl(options?: {
  currentOrigin?: string;
  envUrl?: string;
}): string {
  const envUrl = (options?.envUrl || (import.meta as any)?.env?.VITE_APP_URL || '').trim();
  const currentOrigin = (options?.currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '')).trim();

  if (envUrl) return envUrl.replace(/\/$/, '');

  if (currentOrigin && !/^https?:\/\/localhost(?::\d+)?$/.test(currentOrigin)) {
    return currentOrigin.replace(/\/$/, '');
  }

  return 'https://app-girocerto.vercel.app';
}

export function getSupabaseAuthHashParams(hash = typeof window !== 'undefined' ? window.location.hash : ''): {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  token_type: string | null;
  type: string | null;
} {
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(rawHash);

  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    expires_at: params.get('expires_at'),
    token_type: params.get('token_type'),
    type: params.get('type'),
  };
}

export async function consumeSupabaseAuthHash(supabaseClient: any): Promise<boolean> {
  if (!supabaseClient || typeof window === 'undefined') return false;

  const params = getSupabaseAuthHashParams();
  if (!params.access_token || !params.refresh_token) return false;

  try {
    const { error } = await supabaseClient.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    if (!error) {
      const nextUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, nextUrl);
      return true;
    }

    console.warn('Supabase auth hash not applied:', error);
    return false;
  } catch (error) {
    console.warn('Erro ao consumir token de autenticação do hash:', error);
    return false;
  }
}
