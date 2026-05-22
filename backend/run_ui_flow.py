from playwright.sync_api import sync_playwright
import time
import sys

def run():
    print("Iniciando automatizacion visual del flujo de UI...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=False, slow_mo=1000)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Paso 1: Login como usuario (test@example.com)")
            page.goto("http://localhost:4200/login")
            page.fill("input[type='email']", "test@example.com")
            page.fill("input[type='password']", "testpassword123")
            page.click("button[type='submit']")
            page.wait_for_url("**/dashboard")

            print("Paso 2: Crear ticket")
            page.locator("button:has-text('Nuevo ticket'), button:has-text('Crear ticket'), button:has-text('+ Nuevo Ticket')").first.click()
            page.wait_for_selector("input#titulo")
            
            page.fill("input#titulo", "Fallo critico en base de datos")
            page.fill("textarea#descripcion", "El sistema no permite realizar consultas desde esta mañana. Se requiere soporte urgente.")
            page.select_option("select#prioridad", "critica")
            page.select_option("select#estado", "abierto")
            
            # Click submit
            page.click("button[type='submit']")
            
            # Wait for navigation back to tickets list
            page.wait_for_url("**/tickets", timeout=10000)
            print("Ticket creado y redirigido a la lista.")

            print("Paso 3: Cerrar sesion de usuario")
            page.locator("button:has-text('Cerrar sesión'), button:has-text('Logout')").first.click()
            page.wait_for_url("**/login")

            print("Paso 4: Login como administrador (admin@example.com)")
            page.fill("input[type='email']", "admin@example.com")
            page.fill("input[type='password']", "admin123")
            page.click("button[type='submit']")
            page.wait_for_url("**/dashboard")

            print("Paso 5: Administrador gestiona el ticket")
            page.locator("button:has-text('Ir a tickets'), button:has-text('Abrir tablero')").first.click()
            page.wait_for_url("**/tickets")
            
            # Wait for table
            page.wait_for_selector("table", timeout=10000)
            
            print("Cambiando estado a 'En progreso'...")
            page.locator("button.btn-edit, button:has-text('Editar')").first.click()
            page.wait_for_selector("select#estado")
            page.select_option("select#estado", "en_progreso")
            page.click("button[type='submit']")
            page.wait_for_url("**/tickets")
            
            print("Cambiando estado a 'Resuelto'...")
            page.wait_for_selector("table", timeout=10000)
            page.locator("button.btn-edit, button:has-text('Editar')").first.click()
            page.wait_for_selector("select#estado")
            page.select_option("select#estado", "resuelto")
            page.click("button[type='submit']")
            page.wait_for_url("**/tickets")

            print("Cambiando estado a 'Cerrado'...")
            page.wait_for_selector("table", timeout=10000)
            page.locator("button.btn-edit, button:has-text('Editar')").first.click()
            page.wait_for_selector("select#estado")
            page.select_option("select#estado", "cerrado")
            page.click("button[type='submit']")
            page.wait_for_url("**/tickets")
            
            print("Flujo de UI completado exitosamente.")
            time.sleep(3)
        except Exception as e:
            print("Ocurrio un error visualizando el flujo:", e)
            page.screenshot(path="error_screenshot.png")
            print("Screenshot saved to error_screenshot.png")
            sys.exit(1)
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    run()
