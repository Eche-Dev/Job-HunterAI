# Arquitectura de Seguridad y Gatekeeper WAF

## 1. Integración de Gatekeeper WAF (Middleware ASGI en FastAPI)
Inspirado en el proyecto abierto **Gatekeeper WAF** de Eche-Dev, el backend incorpora una capa de defensa perimetral activa (`app/core/gatekeeper_waf.py`) que se ejecuta antes de cualquier endpoint:

1. **Inspección de Payloads y Parámetros (Reglas OWASP):**
   - Bloqueo de patrones de **SQL Injection (SQLi)** (`UNION SELECT`, `OR 1=1`, `--`, `DROP TABLE`).
   - Bloqueo de **Cross-Site Scripting (XSS)** (`<script>`, `javascript:`, `onerror=`, `onload=`).
   - Bloqueo de **Path Traversal & Command Injection** (`../`, `/etc/passwd`, `cmd.exe`, `; rm -rf`).
2. **Rate Limiting Diferenciado por IP y Ruta:**
   - Rutas públicas (`/api/v1/jobs`): Límite holgado (120 peticiones/minuto).
   - Ruta de Login (`/api/v1/auth/login`): Límite estricto anti-fuerza bruta (10 intentos/minuto).
   - Ruta de Ejecución de Búsqueda (`/api/v1/admin/search-runs`): Límite de protección de costes (5 ejecuciones/minuto).
3. **Cabeceras de Seguridad HTTP Automáticas:**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy` y `X-Powered-By: Gatekeeper-WAF/2.0`
4. **Registro de Eventos de Seguridad:**
   - Cada bloqueo o intento sospechoso queda registrado en memoria y base de datos para que el administrador pueda auditarlo desde su panel privado.

## 2. Protección contra Prompt Injection en Ofertas de Empleo
- Las descripciones de ofertas provienen de terceros en Internet y se tratan como **texto no confiable (untrusted input)**.
- Antes de enviarse al Motor B (IA), se sanean etiquetas ocultas e instrucciones maliciosas (ej. `"Ignore previous instructions"`), y la respuesta de la IA se valida estrictamente mediante esquemas **Pydantic**.

## 3. Gestión de Secretos
- Ningún token (`APIFY_API_TOKEN`, `AI_API_KEY`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET_KEY`, `DATABASE_URL`) se expone jamás en el frontend ni se sube a Git.
- El panel administrativo requiere autenticación con token JWT de sesión y contraseña verificada criptográficamente.
