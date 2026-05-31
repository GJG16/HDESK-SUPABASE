import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4200';

test('Kanban diagnostic: carga, consola y red', async ({ page }) => {
  const consoleMsgs: string[] = [];
  const failedRequests: Array<{url:string,status?:number,method?:string,err?:string}> = [];

  page.on('console', msg => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), method: req.method(), err: String(req.failure()) }));
  page.on('response', resp => {
    if (resp.status() >= 400) failedRequests.push({ url: resp.url(), status: resp.status(), method: resp.request().method() });
  });

  await page.goto(`${BASE}/login`);
  // intentar login como agente para ver permisos de Kanban
  await page.fill('#email', 'agente@example.com');
  await page.fill('#password', 'agente123');
  await page.click('button:has-text("Entrar al sistema")');
  await page.waitForFunction(() => !!localStorage.getItem('access_token'), null, { timeout: 10000 });

  await page.goto(`${BASE}/tickets/kanban`);
  // diagnóstico: comprobar URL actual y localStorage
  const currentUrl = page.url();
  const storedToken = await page.evaluate(() => localStorage.getItem('access_token'));
  const storedUser = await page.evaluate(() => localStorage.getItem('currentUser'));
  console.log('KANBAN_DIAG url=', currentUrl);
  console.log('KANBAN_DIAG token?', !!storedToken, 'user?', storedUser?.substring(0,200));

  // Dump quick DOM counts immediately after navigation
  const immediateCounts = await page.evaluate(() => ({
    loading: document.querySelectorAll('[data-testid=kanban-loading]').length,
    error: document.querySelectorAll('[data-testid=kanban-error]').length,
    board: document.querySelectorAll('[data-testid=kanban-board]').length
  }));
  console.log('KANBAN_DIAG immediate DOM counts:', immediateCounts);

  // Comprobar fetch directo al endpoint usado por TicketService (nota: con slash final)
  const apiCheck = await page.evaluate(async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/tickets/');
      const text = await resp.text();
      return { status: resp.status, text: text.substring(0, 500) };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('KANBAN_DIAG apiCheck:', apiCheck);

  // Comprobar fetch autenticado con el token que hay en localStorage
  const apiAuthCheck = await page.evaluate(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://localhost:8000/api/tickets/', { headers: { Authorization: `Bearer ${token}` } });
      const json = await resp.json();
      return { status: resp.status, count: Array.isArray(json) ? json.length : null };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('KANBAN_DIAG apiAuthCheck:', apiAuthCheck);
  // esperar a que el componente muestre el tablero o un error
  const board = page.locator('[data-testid=kanban-board]');
  const loading = page.locator('[data-testid=kanban-loading]');
  const errorEl = page.locator('[data-testid=kanban-error]');

  // esperar hasta 12s por board o error
  try {
    await Promise.race([
      board.waitFor({ state: 'visible', timeout: 12000 }),
      errorEl.waitFor({ state: 'visible', timeout: 12000 }),
      loading.waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {})
    ]);
  } catch (err) {
    console.log('KANBAN_DIAG timeout waiting for board/error/loading');
    console.log('KANBAN_DIAG console messages:', consoleMsgs.slice(-50));
    console.log('KANBAN_DIAG failed requests:', failedRequests.slice(-50));
    throw err;
  }

  const presentBoard = await board.count() > 0;
  const presentError = await errorEl.count() > 0;
  const cards = await page.locator('[data-testid=kanban-card]').count();

  console.log('KANBAN_DIAG board=', presentBoard, 'error=', presentError, 'cards=', cards);
  console.log('KANBAN_DIAG console messages:', consoleMsgs.slice(-20));
  console.log('KANBAN_DIAG failed requests:', failedRequests.slice(-20));

  // Falla el test si ni board ni error aparecen
  if (!presentBoard && !presentError) {
    throw new Error('Ni tablero ni mensaje de error aparecieron (revisar consola y red).');
  }
});
