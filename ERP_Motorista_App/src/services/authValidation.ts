export type AuthMode = 'signup' | 'login';

export function validateAuthCredentials(password: string, mode: AuthMode): string | null {
  if (!password) {
    return 'Informe uma senha.';
  }

  if (mode === 'signup' && password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  return null;
}