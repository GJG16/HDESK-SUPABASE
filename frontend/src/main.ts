import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Hook temporal: interceptar window.fetch para loggear llamadas a /api/tickets/
try {
  const _origFetch = (window as any).fetch;
  // Reemplazo seguro con any para evitar errores de tipado en TypeScript
  (window as any).fetch = function(...args: any[]): Promise<any> {
    try {
      const input = args[0];
      const init = args[1];
      const url = typeof input === 'string' ? input : (input && (input as any).url);
      if (url && String(url).includes('/api/tickets')) {
        const headers = (init && (init as any).headers) || (typeof input !== 'string' && (input as any).headers) || {};
        const hasAuth = !!(headers && ((headers as any).Authorization || (headers as any).authorization));
        console.debug('fetch-hook: /api/tickets/ called, hasAuth=', hasAuth, 'url=', url, 'initHeaders=', headers);
      }
    } catch (e) {
      // no-op
    }
    return _origFetch.apply(this, args);
  };
} catch (e) {
  // no-op
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
