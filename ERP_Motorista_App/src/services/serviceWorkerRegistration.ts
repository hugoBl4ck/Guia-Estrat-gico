/**
 * Registro e Gerenciamento do Ciclo de Vida do Service Worker (PWA)
 * - Garante atualização imediata sem cache fantasma
 * - Checa atualizações em segundo plano e ao focar no app
 * - Aplica novas versões instantaneamente quando publicadas na Vercel
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (window.location.protocol !== 'https:' && !isLocalhost) return;

  window.addEventListener('load', async () => {
    try {
      // updateViaCache: 'none' força o navegador a NUNCA usar cache HTTP para o arquivo sw.js
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });

      console.log('✅ [PWA] Service Worker registrado:', registration.scope);

      // 1. Forçar checagem de nova versão imediatamente na inicialização
      registration.update().catch(() => {});

      // 2. Checar periodicamente por novas versões a cada 10 minutos
      setInterval(() => {
        registration.update().catch(() => {});
      }, 10 * 60 * 1000);

      // 3. Checar por atualizações sempre que o motorista reabrir/focar no app no celular
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

      // 4. Se um novo Service Worker estiver sendo instalado, acionar skipWaiting assim que pronto
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 [PWA] Nova versão detectada! Atualizando aplicação...');
            installingWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // 5. Quando o novo Service Worker assumir o controle (controllerchange), recarrega para servir a nova versão
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('🚀 [PWA] Nova versão ativada com sucesso. Recarregando interface...');
          window.location.reload();
        }
      });
    } catch (error) {
      console.warn('⚠️ [PWA] Erro ao registrar Service Worker:', error);
    }
  });
}
