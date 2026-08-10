export function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('Erro ao registrar Service Worker:', err);
        });
    });
  }
}
