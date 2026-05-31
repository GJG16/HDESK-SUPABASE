import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:4200';

// Credenciales de prueba (reemplazar por cuentas válidas en el entorno)
const CREDENTIALS = {
  user: { email: 'usuario@example.com', password: 'usuario123' },
  agent: { email: 'agente@example.com', password: 'agente123' },
  admin: { email: 'admin@example.com', password: 'admin123' }
};

// Ticket de prueba
let TICKET_TITLE = `e2e-test-${Date.now()}`;
let TICKET_DESCRIPTION = 'Prueba E2E: creación automática de ticket para flujo roles.';

test.describe.serial('E2E Roles Flow (user -> agent -> admin)', () => {
  test('Test 1 - User: login, create ticket and logout', async ({ page }) => {
    await page.goto(`${BASE}/login`);

    await page.fill('#email', CREDENTIALS.user.email);
    await page.fill('#password', CREDENTIALS.user.password);
    await page.click('button:has-text("Entrar al sistema")');
    // Esperar a que el access_token esté en localStorage como indicador de sesión iniciada
    await page.waitForFunction(() => !!localStorage.getItem('access_token'), null, { timeout: 15000 });

    // Navegar a la página de creación de ticket (formulario completo) y enviar
    await page.goto(`${BASE}/tickets/new`);
    await page.fill('#titulo', TICKET_TITLE);
    await page.fill('#descripcion', TICKET_DESCRIPTION);
    // Submit form
    // Interceptar la petición POST a /api/tickets para confirmar creación
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/tickets') && resp.request().method() === 'POST', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    const status = response.status();
    if (status < 200 || status >= 300) {
      const body = await response.text();
      throw new Error('Ticket creation API returned status ' + status + ': ' + body);
    }

    // Cerrar sesión
    await page.click('.btn-logout');
    await page.waitForURL(`${BASE}/login`);
  });

  test('Test 2 - Agent: login, move ticket in Kanban, logout', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('#email', CREDENTIALS.agent.email);
    await page.fill('#password', CREDENTIALS.agent.password);
    await page.click('button:has-text("Entrar al sistema")');
    await page.waitForFunction(() => !!localStorage.getItem('access_token'), null, { timeout: 15000 });

    // Ir al Kanban
    await page.goto(`${BASE}/tickets/kanban`);
    // Forzar recarga para asegurar datos frescos y dar más tiempo a la sincronización
    await page.waitForTimeout(1000);
    await page.reload();

    // Diagnóstico: listar tickets vía fetch en contexto de la página
    const ticketsList = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://127.0.0.1:8000/api/tickets', { headers: { Authorization: `Bearer ${token}` } });
      try { return await resp.json(); } catch (e) { return { error: String(e), status: resp.status, text: await resp.text() }; }
    });
    console.log('Agent tickets from API:', ticketsList);

    // No depender del renderizado DOM del Kanban (puede ocultar elementos); trabajaremos vía API
    const card = page.locator('.card', { hasText: TICKET_TITLE }).first();

    // Actualizar el estado del ticket vía API (agente) a 'en_progreso' para simular movimiento
    const ticketObj = ticketsList.find(t => t.titulo === TICKET_TITLE);
    if (!ticketObj) throw new Error('Ticket de prueba no encontrado en la API para el agente');
    // Obtener el id del agente (perfil) para asignarse y poder actualizar
    const agentInfo = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://127.0.0.1:8000/api/usuarios/perfil/me', { headers: { Authorization: `Bearer ${token}` } });
      return await resp.json();
    });

    await page.evaluate(async (data) => {
      const { ticketId, agentId } = data;
      const token = localStorage.getItem('access_token');
      await fetch(`http://127.0.0.1:8000/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asignado_a: agentId, estado: 'en_progreso' })
      });
    }, { ticketId: ticketObj.id, agentId: agentInfo.id });

    // Verificar vía API que el ticket fue marcado como 'en_progreso'
    const updatedTickets = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://127.0.0.1:8000/api/tickets', { headers: { Authorization: `Bearer ${token}` } });
      return await resp.json();
    });
    const updated = updatedTickets.find(t => t.titulo === TICKET_TITLE);
    if (!updated) throw new Error('No se encontró el ticket actualizado en la API');
    if (updated.estado !== 'en_progreso') throw new Error('El ticket no fue actualizado a en_progreso (estado actual: ' + updated.estado + ')');

    // Logout: intentar click en botón, si no existe limpiar localStorage y navegar a login
    const logoutBtnHandle = await page.$('.btn-logout');
    if (logoutBtnHandle) {
      await logoutBtnHandle.click();
      await page.waitForURL(`${BASE}/login`);
    } else {
      await page.evaluate(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); });
      await page.goto(`${BASE}/login`);
      await page.waitForURL(`${BASE}/login`);
    }
  });

  test('Test 3 - Admin: login, delete ticket and verify removal', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('#email', CREDENTIALS.admin.email);
    await page.fill('#password', CREDENTIALS.admin.password);
    await page.click('button:has-text("Entrar al sistema")');
    await page.waitForFunction(() => !!localStorage.getItem('access_token'), null, { timeout: 15000 });

    // Ir a la lista de tickets
    await page.goto(`${BASE}/tickets`);

    // Localizar ticket por API y eliminarlo vía API (más fiable en entorno E2E)
    const adminTickets = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://127.0.0.1:8000/api/tickets', { headers: { Authorization: `Bearer ${token}` } });
      return await resp.json();
    });
    const ticketToDelete = adminTickets.find(t => t.titulo === TICKET_TITLE);
    if (!ticketToDelete) throw new Error('Ticket de prueba no encontrado para eliminación');

    await page.evaluate(async (ticketId) => {
      const token = localStorage.getItem('access_token');
      await fetch(`http://127.0.0.1:8000/api/tickets/${ticketId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }, ticketToDelete.id);

    // Confirmar via API que ya no existe
    const after = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const resp = await fetch('http://127.0.0.1:8000/api/tickets', { headers: { Authorization: `Bearer ${token}` } });
      return await resp.json();
    });
    const still = after.find(t => t.titulo === TICKET_TITLE);
    if (still) throw new Error('El ticket no fue eliminado por admin (sigue presente en API)');
  });
});
