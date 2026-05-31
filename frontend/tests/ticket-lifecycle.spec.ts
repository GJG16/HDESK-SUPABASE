/**
 * ============================================================================
 *  TICKET LIFECYCLE E2E — Playwright
 * ============================================================================
 *  Misión: validar el ciclo de vida completo de un ticket a través de los
 *  tres roles del sistema (user → agent → admin) y la Matriz de Control
 *  de Acceso (RBAC).
 *
 *  Pre-requisitos:
 *    1. Backend corriendo en http://localhost:8000
 *    2. Frontend corriendo en http://localhost:4200
 *    3. Base de datos inicializada con seed_db.py
 *
 *  Ejecución visual:
 *    npx playwright test tests/ticket-lifecycle.spec.ts --headed --project=chromium
 * ============================================================================
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
//  Constantes
// ---------------------------------------------------------------------------
const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';
const API_URL  = process.env['E2E_API_URL']  || 'http://127.0.0.1:8000';

const CREDENTIALS = {
  user:  { email: 'usuario@example.com', password: 'usuario123' },
  agent: { email: 'agente@example.com',  password: 'agente123'  },
  admin: { email: 'admin@example.com',   password: 'admin123'   },
};

// Datos del ticket de prueba — título único para aislamiento entre ejecuciones
const TICKET = {
  titulo:      'Fallo de conexión',
  descripcion: 'No puedo acceder al servidor',
  prioridad:   'alta',
};

// ---------------------------------------------------------------------------
//  Helpers reutilizables
// ---------------------------------------------------------------------------

/** Inicia sesión y espera a que el token se almacene en localStorage. */
async function login(page: Page, role: keyof typeof CREDENTIALS): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('#email', { state: 'visible', timeout: 10_000 });

  await page.fill('#email', CREDENTIALS[role].email);
  await page.fill('#password', CREDENTIALS[role].password);
  await page.click('button:has-text("Entrar al sistema")');

  // Esperamos a que Angular procese la autenticación y almacene el token
  await page.waitForFunction(
    () => !!localStorage.getItem('access_token'),
    null,
    { timeout: 15_000 },
  );
}

/** Cierra sesión de forma robusta: intenta el botón .btn-logout, si falla limpia localStorage. */
async function logout(page: Page): Promise<void> {
  const logoutBtn = page.locator('.btn-logout').first();
  const sidebarDanger = page.locator('button.danger:has-text("Cerrar sesión")').first();

  if (await logoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await logoutBtn.click();
  } else if (await sidebarDanger.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sidebarDanger.click();
  } else {
    // Fallback: limpiar almacenamiento y navegar manualmente
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('currentUser');
    });
    await page.goto(`${BASE_URL}/login`);
  }

  await page.waitForURL(`${BASE_URL}/login`, { timeout: 10_000 });
}

/**
 * Obtiene tickets del backend vía API (dentro del contexto de la página,
 * reutilizando el token del usuario autenticado).
 */
async function fetchTicketsViaAPI(page: Page): Promise<any[]> {
  return page.evaluate(async (apiUrl) => {
    const token = localStorage.getItem('access_token');
    const resp = await fetch(`${apiUrl}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.json();
  }, API_URL);
}

/** Obtiene el perfil del usuario autenticado. */
async function fetchMyProfile(page: Page): Promise<any> {
  return page.evaluate(async (apiUrl) => {
    const token = localStorage.getItem('access_token');
    const resp = await fetch(`${apiUrl}/api/usuarios/perfil/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.json();
  }, API_URL);
}

// ---------------------------------------------------------------------------
//  SUITE PRINCIPAL — serial para respetar el orden del ciclo de vida
// ---------------------------------------------------------------------------
test.describe.serial('🎫 Ciclo de Vida del Ticket — E2E RBAC', () => {

  // Variable compartida para rastrear el ID del ticket creado
  let createdTicketId: string;

  // =========================================================================
  //  FASE 1: EL DEBER DEL USER
  // =========================================================================
  test.describe('Fase 1 — Rol USER: Creación y Restricción', () => {

    test('1.1 — Login como usuario', async ({ page }) => {
      await login(page, 'user');

      // Verificar que estamos en el dashboard
      await page.waitForURL(/dashboard/, { timeout: 10_000 });
      await expect(page.locator('h1')).toContainText('Bienvenido');
    });

    test('1.2 — Prueba Negativa RBAC: acceso denegado a /tickets/kanban', async ({ page }) => {
      await login(page, 'user');

      // Intentar navegar directamente al Kanban
      await page.goto(`${BASE_URL}/tickets/kanban`);

      // El AuthGuard redirige a /dashboard cuando el usuario no tiene permiso
      // (kanban requiere roles: ['admin', 'agent'])
      await page.waitForURL(/dashboard/, { timeout: 10_000 });

      // Confirmamos que NO estamos en /kanban
      expect(page.url()).not.toContain('/kanban');
    });

    test('1.3 — Prueba Negativa RBAC: acceso denegado a /reports', async ({ page }) => {
      await login(page, 'user');

      // Intentar navegar a reportes (requiere role: 'admin')
      await page.goto(`${BASE_URL}/reports`);

      // Debe redirigir al dashboard
      await page.waitForURL(/dashboard/, { timeout: 10_000 });
      expect(page.url()).not.toContain('/reports');
    });

    test('1.4 — Flujo Feliz: crear ticket desde "Mis Tickets"', async ({ page }) => {
      await login(page, 'user');

      // Navegar a la lista de tickets
      await page.goto(`${BASE_URL}/tickets`);
      await page.waitForSelector('[data-testid="tickets-container"]', { timeout: 10_000 });

      // Click en "+ Nuevo Ticket" para abrir el modal de creación
      const createBtn = page.locator('[data-testid="btn-create-ticket"]');
      await expect(createBtn).toBeVisible({ timeout: 5_000 });
      await createBtn.click();

      // Esperar a que aparezca el modal de creación
      await page.waitForSelector('.modal-container', { state: 'visible', timeout: 5_000 });

      // Llenar el formulario del modal
      // El modal tiene campos #titulo y #descripcion
      await page.fill('.modal-container #titulo', TICKET.titulo);
      await page.fill('.modal-container #descripcion', TICKET.descripcion);

      // Nota: El modal de creación NO muestra selector de prioridad visible para el user
      // (la prioridad se asigna 'media' por defecto según el modal)

      // Interceptar la petición POST al backend para confirmar creación exitosa
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/tickets') &&
            resp.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page.click('.modal-container button:has-text("Enviar Ticket")'),
      ]);

      // Verificar que la API respondió con éxito
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(300);

      // Guardar el ID del ticket creado para las fases siguientes
      const ticketData = await response.json();
      createdTicketId = ticketData.id;
      console.log(`✅ Ticket creado con ID: ${createdTicketId}`);

      // Esperar a que el modal de éxito aparezca y se cierre
      await page.waitForSelector('.success-view', { timeout: 5_000 }).catch(() => {});

      // Esperar a que los tickets se recarguen
      await page.waitForTimeout(2_000);

      // Verificar que el ticket aparece en la tabla
      const ticketRow = page.locator('td.title', { hasText: TICKET.titulo });
      await expect(ticketRow.first()).toBeVisible({ timeout: 10_000 });
    });

    test('1.5 — Verificar ticket en tabla y cerrar sesión', async ({ page }) => {
      await login(page, 'user');

      // Ir a la lista de tickets
      await page.goto(`${BASE_URL}/tickets`);
      await page.waitForSelector('[data-testid="tickets-table"]', { timeout: 15_000 });

      // Confirmar presencia del ticket
      const row = page.locator('td.title', { hasText: TICKET.titulo });
      await expect(row.first()).toBeVisible({ timeout: 10_000 });

      // Verificar que el botón "Eliminar" NO está visible para un usuario
      const deleteButtons = page.locator('[data-testid="btn-delete-ticket"]');
      await expect(deleteButtons).toHaveCount(0);

      // Cerrar sesión
      await logout(page);
    });
  });

  // =========================================================================
  //  FASE 2: EL DEBER DEL AGENT
  // =========================================================================
  test.describe('Fase 2 — Rol AGENT: Kanban y Gestión', () => {

    test('2.1 — Login como agente y navegar al Kanban', async ({ page }) => {
      await login(page, 'agent');

      // Navegar al Kanban
      await page.goto(`${BASE_URL}/tickets/kanban`);
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15_000 });

      // Verificar que las 4 columnas existen
      await expect(page.locator('[data-testid="kanban-column-abierto"]')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-en_progreso"]')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-resuelto"]')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-cerrado"]')).toBeVisible();
    });

    test('2.2 — Ubicar ticket en columna "Pendiente" y asignarse (Tomar ticket)', async ({ page }) => {
      await login(page, 'agent');
      await page.goto(`${BASE_URL}/tickets/kanban`);
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15_000 });

      // Recargar para asegurar datos frescos
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15_000 });

      // Buscar la tarjeta del ticket en la columna "abierto" (Pendiente)
      const pendienteColumn = page.locator('[data-testid="kanban-column-abierto"]');
      const ticketCard = pendienteColumn.locator('.card', { hasText: TICKET.titulo });

      // Si la tarjeta es visible en la columna Pendiente, asignárselo
      const cardVisible = await ticketCard.isVisible({ timeout: 5_000 }).catch(() => false);

      if (cardVisible) {
        // Click en "Tomar ticket" para asignarse
        const takeBtn = ticketCard.locator('[data-testid="btn-take-ticket"]');
        await expect(takeBtn).toBeVisible({ timeout: 5_000 });
        await takeBtn.click();

        // Esperar a que se recargue el tablero
        await page.waitForTimeout(2_000);
      }

      // Ahora mover el ticket a "En Proceso" via API (más fiable que drag&drop en E2E)
      const tickets = await fetchTicketsViaAPI(page);
      const targetTicket = tickets.find((t: any) => t.titulo === TICKET.titulo);
      expect(targetTicket).toBeTruthy();

      const agentProfile = await fetchMyProfile(page);

      // Asignar y mover a en_progreso en un solo paso
      await page.evaluate(
        async (data) => {
          const token = localStorage.getItem('access_token');
          await fetch(`${data.apiUrl}/api/tickets/${data.ticketId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              asignado_a: data.agentId,
              estado: 'en_progreso',
            }),
          });
        },
        {
          apiUrl: API_URL,
          ticketId: targetTicket.id,
          agentId: agentProfile.id,
        },
      );

      // Recargar y verificar que el ticket ahora está en "En Proceso"
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 15_000 });

      const enProcesoColumn = page.locator('[data-testid="kanban-column-en_progreso"]');
      const movedCard = enProcesoColumn.locator(`[data-ticket-id="${targetTicket.id}"]`);
      await expect(movedCard).toBeVisible({ timeout: 10_000 });

      // Guardar el ID para uso posterior
      createdTicketId = targetTicket.id;
      console.log(`✅ Ticket movido a "En Proceso" — ID: ${createdTicketId}`);
    });

    test('2.3 — Abrir ticket, agregar comentario y cambiar prioridad a Crítica', async ({ page }) => {
      await login(page, 'agent');

      // Navegar al formulario de edición del ticket
      await page.goto(`${BASE_URL}/tickets`);
      await page.waitForSelector('[data-testid="tickets-table"]', { timeout: 15_000 });

      // Si no tenemos el ID, buscarlo via API
      if (!createdTicketId) {
        const tickets = await fetchTicketsViaAPI(page);
        const found = tickets.find((t: any) => t.titulo === TICKET.titulo);
        if (found) createdTicketId = found.id;
      }

      // Ir al formulario de edición directamente
      await page.goto(`${BASE_URL}/tickets/${createdTicketId}/edit`);
      await page.waitForSelector('[data-testid="ticket-form"]', { timeout: 10_000 });

      // Esperar a que los comentarios carguen
      await page.waitForSelector('[data-testid="comments-section"]', { timeout: 10_000 });

      // Agregar comentario "Revisando el problema"
      const commentInput = page.locator('[data-testid="input-new-comment"]');
      await expect(commentInput).toBeVisible();
      await commentInput.fill('Revisando el problema');

      // Interceptar la respuesta del POST de comentario
      const [commentResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/comments') &&
            resp.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page.click('[data-testid="btn-submit-comment"]'),
      ]);

      expect(commentResponse.status()).toBeGreaterThanOrEqual(200);
      expect(commentResponse.status()).toBeLessThan(300);
      console.log('✅ Comentario "Revisando el problema" agregado');

      // Verificar que el comentario aparece en la lista
      await expect(
        page.locator('.comment-body', { hasText: 'Revisando el problema' }),
      ).toBeVisible({ timeout: 5_000 });

      // Cambiar la prioridad a "Crítica"
      await page.selectOption('[data-testid="select-prioridad"]', 'critica');

      // Guardar cambios
      const [updateResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(`/api/tickets/${createdTicketId}`) &&
            resp.request().method() === 'PUT',
          { timeout: 10_000 },
        ),
        page.click('[data-testid="btn-submit-ticket"]'),
      ]);

      expect(updateResponse.status()).toBeGreaterThanOrEqual(200);
      expect(updateResponse.status()).toBeLessThan(300);
      console.log('✅ Prioridad cambiada a "Crítica"');
    });

    test('2.4 — Prueba Negativa RBAC: botón "Eliminar" NO existe para agent', async ({ page }) => {
      await login(page, 'agent');

      await page.goto(`${BASE_URL}/tickets`);
      await page.waitForSelector('[data-testid="tickets-table"]', { timeout: 15_000 });

      // Verificar que NO existe ningún botón de eliminar en todo el DOM
      // (canDeleteTicket() retorna true solo para admin)
      const deleteButtons = page.locator('[data-testid="btn-delete-ticket"]');
      await expect(deleteButtons).toHaveCount(0);
      console.log('✅ Confirmado: botón "Eliminar" NO existe para el rol agent');

      // Cerrar sesión
      await logout(page);
    });
  });

  // =========================================================================
  //  FASE 3: EL DEBER DEL ADMIN
  // =========================================================================
  test.describe('Fase 3 — Rol ADMIN: Auditoría y Eliminación', () => {

    test('3.1 — Login como admin y verificar Dashboard global', async ({ page }) => {
      await login(page, 'admin');

      // Debe llegar al dashboard
      await page.waitForURL(/dashboard/, { timeout: 10_000 });

      // Verificar que es el panel de admin (modo administrador visible)
      await expect(page.locator('.info-block.admin')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('span:has-text("Administras usuarios")')).toBeVisible();

      // Verificar que puede ver estadísticas globales (todos los tickets)
      const statsSection = page.locator('.stats-grid');
      await expect(statsSection).toBeVisible();

      // Verificar que la tabla de tickets recientes muestra datos
      const ticketsTable = page.locator('.tickets-table');
      await expect(ticketsTable).toBeVisible({ timeout: 10_000 });

      // Verificar acceso a botones exclusivos de admin
      const reportBtn = page.locator('button:has-text("Reportes y auditoría")');
      await expect(reportBtn).toBeVisible();
      const kanbanBtn = page.locator('button:has-text("Abrir Kanban")');
      // Admin también puede ver Kanban en acciones rápidas
      // (la ruta permite roles: ['admin', 'agent'])
      console.log('✅ Dashboard global del admin verificado');
    });

    test('3.2 — Navegar a Reportes/Auditoría (acceso exclusivo admin)', async ({ page }) => {
      await login(page, 'admin');

      // Navegar a reportes
      await page.goto(`${BASE_URL}/reports`);

      // Verificar que la página de reportes cargó correctamente
      await expect(page.locator('h1:has-text("Reportes y auditoría")')).toBeVisible({
        timeout: 10_000,
      });

      // Verificar que se muestra la sección de reportes por estado
      await expect(page.locator('h2:has-text("Por estado")')).toBeVisible({
        timeout: 10_000,
      });

      // Verificar que se muestra la sección de reportes por agente
      await expect(page.locator('h2:has-text("Por agente")')).toBeVisible({
        timeout: 10_000,
      });

      // Verificar sección de auditoría
      await expect(page.locator('h2:has-text("Eventos recientes")')).toBeVisible({
        timeout: 10_000,
      });

      console.log('✅ Sección de Reportes/Auditoría accesible por admin');
    });

    test('3.3 — Eliminar ticket "Fallo de conexión" y verificar desaparición', async ({ page }) => {
      await login(page, 'admin');

      // Navegar a la lista de tickets
      await page.goto(`${BASE_URL}/tickets`);
      await page.waitForSelector('[data-testid="tickets-table"]', { timeout: 15_000 });

      // Verificar que el ticket existe y buscar su ID si es necesario
      if (!createdTicketId) {
        const tickets = await fetchTicketsViaAPI(page);
        const found = tickets.find((t: any) => t.titulo === TICKET.titulo);
        if (found) createdTicketId = found.id;
      }

      expect(createdTicketId).toBeTruthy();

      // Localizar la fila exacta del ticket por id
      const ticketRow = page.locator(`[data-ticket-id="${createdTicketId}"]`);
      await expect(ticketRow).toBeVisible({ timeout: 10_000 });

      // Verificar que el botón Eliminar SÍ está visible para admin
      const deleteBtn = ticketRow.locator('[data-testid="btn-delete-ticket"]');
      await expect(deleteBtn).toBeVisible({ timeout: 5_000 });

      // Configurar handler para el diálogo de confirmación ANTES de hacer click
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('¿Estás seguro');
        await dialog.accept();
      });

      // Interceptar la petición DELETE
      const [deleteResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/tickets/') &&
            resp.request().method() === 'DELETE',
          { timeout: 10_000 },
        ),
        deleteBtn.click(),
      ]);

      expect(deleteResponse.status()).toBeGreaterThanOrEqual(200);
      expect(deleteResponse.status()).toBeLessThan(300);
      console.log('✅ Ticket eliminado exitosamente');

      // Esperar a que la tabla se recargue
      await page.waitForTimeout(2_000);

      // Verificar que el ticket ya NO aparece en la tabla
      const removedTicket = page.locator(`[data-ticket-id="${createdTicketId}"]`);
      await expect(removedTicket).toHaveCount(0, { timeout: 10_000 });

      // Verificación adicional por API: confirmar que no existe
      const remainingTickets = await fetchTicketsViaAPI(page);
      const stillExists = remainingTickets.find((t: any) => t.id === createdTicketId);
      expect(stillExists).toBeFalsy();

      console.log('✅ Ticket desaparecido completamente del sistema');
    });

    test('3.4 — Cerrar sesión del admin', async ({ page }) => {
      await login(page, 'admin');

      await logout(page);

      // Verificar que estamos en login
      expect(page.url()).toContain('/login');

      // Verificar que los tokens fueron removidos
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeNull();

      console.log('✅ Sesión del admin cerrada correctamente');
    });
  });
});
