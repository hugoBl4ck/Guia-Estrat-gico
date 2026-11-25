import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { GiroCertoLogo } from './GiroCertoLogo';
import { validateAuthCredentials } from '../services/authValidation';
import { getAuthRedirectUrl } from '../services/authRedirect';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string, name?: string, userId?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setOauthLoading(true);
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado neste ambiente.');
      }
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn('Google OAuth Error:', err);
      setErrorMsg(
        err?.message ||
          'Não foi possível iniciar o login com Google. Verifique se o provedor Google está ativado no Supabase.'
      );
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanName = fullName.trim() || undefined;
    const emailRedirectTo = getAuthRedirectUrl();

    try {
      const validationError = validateAuthCredentials(password, isSignUp ? 'signup' : 'login');
      if (validationError) {
        setErrorMsg(validationError);
        return;
      }

      if (!supabase) {
        throw new Error('Supabase não está configurado neste ambiente.');
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: cleanName,
              name: cleanName,
            }
          }
        });
        if (error) throw error;

        if (!data.session || !data.user) {
          setSuccessMsg('Conta criada. Confirme seu e-mail para concluir o acesso.');
          return;
        }

        setSuccessMsg('Conta criada com sucesso! Você já está autenticado.');
        setTimeout(() => {
          onAuthSuccess(email, cleanName, data.user.id);
          onClose();
        }, 1000);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (!data.session || !data.user) throw new Error('O Supabase não criou uma sessão válida.');

        const userMeta = data?.user?.user_metadata;
        const resolvedName = userMeta?.full_name || userMeta?.name || cleanName;

        setSuccessMsg(`Bem-vindo de volta, ${email}!`);
        setTimeout(() => {
          onAuthSuccess(email, resolvedName, data.user.id);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.warn('Auth Error:', err);
      setErrorMsg(err?.message || 'Não foi possível autenticar. Verifique seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <GiroCertoLogo variant="icon" size="md" />
          <div>
            <h3 className="font-extrabold text-base text-white">
              {isSignUp ? 'Criar Conta de Motorista' : 'Login de Acesso ERP'}
            </h3>
            <p className="text-xs text-slate-400">
              Sincronização em nuvem e segurança de dados
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading || oauthLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>{oauthLoading ? 'Conectando ao Google...' : 'Continuar com Google (Gmail)'}</span>
          </button>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
            <span className="flex-1 h-px bg-slate-800" />
            <span>ou com e-mail e senha</span>
            <span className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                Nome Completo (Como quer ser chamado)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ex: Hugo Vieira"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> E-mail do Motorista
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: motorista@exemplo.com"
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha de acesso"
              required
              minLength={isSignUp ? 8 : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-amber-400 bg-amber-950/60 border border-amber-800 p-2.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Autenticando...' : isSignUp ? 'Criar Minha Conta' : 'Entrar no GiroCerto ERP'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-slate-400 hover:text-emerald-400 underline font-semibold transition-colors"
          >
            {isSignUp ? 'Já possui conta? Clique para Entrar' : 'Não tem conta? Cadastrar como Novo Motorista'}
          </button>
        </div>
      </div>
    </div>
  );
};
