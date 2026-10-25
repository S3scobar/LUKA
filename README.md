# LUKA — Sistema de Gestión Financiera Personal

![Frontend](https://img.shields.io/badge/Frontend-HTML5_%7C_CSS3_%7C_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-Fintech_Slate_Blue-2563EB?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Beta-00C853?style=for-the-badge)

LUKA es una aplicación web orientada a la administración de finanzas personales: registro de gastos cotidianos en un toque, control de cuentas y billeteras, presupuestos por categoría, seguimiento de tarjetas de crédito, suscripciones recurrentes y fondos de ahorro con rendimiento. Está construida con una arquitectura cliente liviana basada en estándares web nativos (HTML5, CSS3, JavaScript ES Modules) y respaldada por Supabase (PostgreSQL, Row Level Security y Auth).

---

## 1. Contexto y Planteamiento del Problema

La mayoría de las aplicaciones de finanzas personales fracasan por una razón recurrente: **la fricción en el registro**. Los flujos convencionales requieren navegar entre múltiples pantallas, abrir listas desplegables anidadas, seleccionar fechas y confirmar formularios extensos. Esta sobrecarga provoca que el usuario abandone el registro a los pocos días, perdiendo la trazabilidad de sus gastos hormiga.

Además, los usuarios suelen enfrentar cuatro problemas estructurales:

1. **Descentralización de cuentas:** el dinero está repartido entre efectivo, cuentas bancarias y billeteras digitales (Nequi, Nu, etc.), lo que dificulta conocer el saldo real de cada una.
2. **Fuga por suscripciones fijas:** es difícil auditar qué pagos periódicos (telefonía, servicios, membresías) ya se debitaron y cuáles siguen pendientes en el mes.
3. **Falta de visibilidad del ahorro:** no hay distinción clara entre el dinero operativo y los fondos de ahorro acumulados.
4. **Opacidad del crédito:** las compras a cuotas y los avances en tarjeta hacen difícil saber cuánto se debe, cuánto cuesta en intereses y cuándo vence el pago.

---

## 2. Propuesta de Solución y Filosofía de Diseño

* **Registro en un solo toque:** el formulario principal pide solo un concepto, un monto y ofrece acceso directo a las cuatro categorías favoritas del usuario. Al tocar la categoría, el movimiento se guarda sin pantallas intermedias.
* **Saldos coherentes con los movimientos:** el saldo de cada billetera debe reflejar siempre sus transacciones. La lógica de saldos se apoya en la base de datos para los movimientos simples; las operaciones compuestas (transferencias, tarjetas) se coordinan desde los servicios del cliente (ver sección 8).
* **Aislamiento multi-usuario:** se usa Row Level Security (RLS) de Supabase; cada fila pertenece a un `user_id` y las políticas limitan el acceso a `auth.uid() = user_id`.
* **Cero dependencias pesadas en el frontend:** sin React, Vue ni Angular, y sin bundlers. Se usan ES Modules nativos para lograr una carga inicial rápida y máxima portabilidad.
* **Pensada para móvil:** navegación por pestañas deslizables con el pulgar, entradas numéricas con separador de miles automático (formato `es-CO`) y un tutorial interactivo en el primer ingreso.
* **Tema claro y oscuro:** todos los colores salen de variables CSS (tokens) definidas en `css/main.css`; el tema oscuro solo redefine esas variables, por lo que cualquier componente nuevo lo hereda sin código extra.

---

## 3. Módulos del Sistema

### 3.1. Inicio y Registro Rápido
* Métricas del mes: ingresos, gastos y balance neto.
* Barra de registro rápido: elegir cuenta, escribir el monto y tocar una de las 4 categorías favoritas.
* Selector modal para categorías secundarias.
* Movimientos recientes (últimos 5, con opción de ver todos) y eliminación de transacciones.
* Banner con el total estimado a pagar de las tarjetas de crédito y su fecha límite más cercana.

### 3.2. Billeteras
* Múltiples cuentas (efectivo, bancos, billeteras digitales) con icono y color propios.
* Ajuste manual de saldo para conciliar diferencias con la realidad.
* **Transferencias entre cuentas** que no afectan los ingresos ni los gastos del mes.
* Gestión de categorías: crear, editar, eliminar y fijar hasta 4 favoritas para el registro rápido. Una categoría con movimientos asociados no puede eliminarse (solo editarse).

### 3.3. Presupuestos
* Límite mensual por categoría de gasto.
* Cruce automático con las transacciones reales del mes: gastado, restante, porcentaje de uso y aviso de presupuesto excedido.
* Resumen global (total presupuestado vs. total gastado) y detalle de las transacciones de cada categoría.

### 3.4. Tarjetas de Crédito
* Cada tarjeta crea una billetera vinculada que representa el **cupo disponible**.
* Registro de **compras a cuotas** y **avances en efectivo** (con comisión y cuenta de destino), con opción de compra a 0 % de interés.
* **Proyección del extracto** del próximo corte: capital de cuotas, intereses (tasa E.A. convertida a mensual), cuota de manejo y fecha límite de pago.
* Pago de tarjeta desde una cuenta de débito: libera cupo, avanza las cuotas pagadas y registra el gasto.
* Eliminar una compra restaura el cupo disponible.

### 3.5. Suscripciones y Pagos Fijos
* Pagos recurrentes asociados a un día de cobro, billetera y categoría.
* Estado dinámico *Pendiente* / *Pagada* calculado a partir de las transacciones del mes en curso; se reinicia solo cada mes calendario, sin tareas programadas en el servidor.
* Confirmar un pago con un clic genera el gasto y descuenta el saldo de la cuenta elegida.
* Pausar, reanudar o eliminar suscripciones.

### 3.6. Ahorros (Cajitas y Metas)
* Fondos con meta (monto objetivo y fecha opcional) o sin ella.
* **Rendimiento opcional** por tasa efectiva anual: los intereses se liquidan por días completos transcurridos con interés compuesto cada vez que se consultan los fondos.
* Aportes que descuentan de la billetera elegida (se registran como gasto de ahorro) y retiros que regresan el dinero a una billetera (se registran como ingreso).
* Barra de progreso hacia la meta.

### 3.7. Análisis
* **Consolidado mensual:** ingresos, egresos y balance neto.
* **Gasto por categoría:** distribución porcentual y monto acumulado, con la categoría de mayor impacto.
* **Consolidado anual:** comparativa mes a mes de ingresos vs. egresos.
* Navegación entre meses y años.

### 3.8. Tutorial interactivo
* Guía paso a paso por cada pestaña, disponible desde un botón flotante.

### 3.9. Modo oscuro
* Botón de luna/sol en el header (visible también en la pantalla de acceso).
* Orden de prioridad: preferencia guardada por el usuario (`localStorage`, clave `luka_theme`) > preferencia del sistema (`prefers-color-scheme`).
* Un pequeño script en `<head>` aplica el tema antes de pintar, evitando el parpadeo blanco al cargar.
* Si el usuario nunca eligió manualmente, la app sigue los cambios del sistema en tiempo real.
* Actualiza el `theme-color` del navegador móvil y usa `color-scheme` para que los controles nativos (fechas, selects, scrollbars) también se vean oscuros.

---

## 4. Arquitectura de Software y Stack Tecnológico

### Capa Cliente
* **Lenguajes:** HTML5, CSS3 con variables y diseño responsivo, JavaScript vanilla (ES2020+).
* **Modularización:** servicios de datos (`js/services`), componentes reutilizables (`js/components`) y vistas (`js/views`), todo cargado con ES Modules nativos.
* **Dependencias por CDN:** Font Awesome 6 (iconos) y `@supabase/supabase-js` v2 (vía jsDelivr).
* **Navegación:** SPA de una sola página; `index.html` alterna entre vistas según la pestaña activa.

### Capa de Datos (Backend as a Service)
* **Plataforma:** Supabase.
* **Base de datos:** PostgreSQL con Row Level Security.
* **Autenticación:** Supabase Auth (correo y contraseña) con JWT.

### Infraestructura
* **Despliegue:** Vercel (sitio estático con `cleanUrls` y reescritura de todas las rutas a `index.html`).
* **Control de versiones:** Git / GitHub.

---

## 5. Estructura del Directorio

```text
├── index.html                      # Estructura HTML, script anti-parpadeo del tema y carga de js/main.js
├── vercel.json                     # cleanUrls + reescritura de rutas para SPA
├── favicon.svg                     # Icono de la app
├── .gitignore
├── README.md
├── css/
│   ├── main.css                    # Tokens de diseño (tema claro y oscuro), reset y tipografía
│   ├── components.css              # Botones, tarjetas, modales y formularios
│   └── views.css                   # Estilos específicos de cada vista
└── js/
    ├── main.js                     # Punto de entrada: sesión, navegación entre vistas y tema
    ├── config.js                   # URL y clave pública (anon) de Supabase
    ├── supabaseClient.js           # Cliente Supabase y requireUserId() (id desde la sesión local)
    ├── themeManager.js             # Tema claro/oscuro: preferencia, persistencia y botón
    ├── utils.js                    # escapeHtml() para texto del usuario en plantillas
    ├── currencyFormatter.js        # Entrada de moneda con separador de miles (es-CO)
    ├── services/
    │   ├── authService.js          # Registro, login, logout y sesión
    │   ├── walletService.js        # Billeteras, ajustes de saldo y transferencias
    │   ├── categoryService.js      # Categorías y favoritas
    │   ├── transactionService.js   # Transacciones (consulta mensual/anual, alta y baja)
    │   ├── budgetService.js        # Presupuestos por categoría y su avance
    │   ├── creditCardService.js    # Tarjetas, compras, avances, pagos y extracto
    │   ├── subscriptionService.js  # Pagos fijos recurrentes
    │   └── goalService.js          # Fondos de ahorro, aportes, retiros y rendimientos
    ├── components/
    │   ├── quickExpenseBar.js      # Barra de registro rápido
    │   ├── modalCategoryPicker.js  # Selector modal de categorías
    │   └── tutorialTour.js         # Tutorial interactivo
    └── views/
        ├── authView.js             # Login y registro
        ├── dashboardView.js        # Inicio: métricas, registro rápido e historial
        ├── walletsView.js          # Cuentas, transferencias y categorías
        ├── budgetsView.js          # Presupuestos
        ├── creditCardsView.js      # Tarjetas de crédito
        ├── subscriptionsView.js    # Suscripciones
        ├── savingsView.js          # Ahorros
        └── analyticsView.js        # Análisis mensual y anual
```

> **Nota:** los nombres de archivo distinguen mayúsculas y minúsculas en Linux/Vercel. Todos los módulos usan `camelCase` y los imports deben coincidir exactamente.

---

## 6. Modelo de Datos

El código consume las siguientes tablas de Supabase (el esquema SQL no está versionado en este repositorio):

| Tabla | Propósito |
|---|---|
| `wallets` | Cuentas y billeteras con su saldo; también representa el cupo disponible de cada tarjeta |
| `categories` | Categorías de gasto o ingreso, con favoritas ordenadas |
| `transactions` | Ingresos y gastos asociados a una billetera y una categoría |
| `budgets` | Límite mensual por categoría (único por `user_id` + `category_id`) |
| `credit_cards` | Datos de la tarjeta: cupo, tasa E.A., día de corte, día de pago y cuota de manejo |
| `credit_card_purchases` | Compras y avances con número de cuotas, cuotas pagadas y comisión |
| `subscriptions` | Pagos recurrentes con día de cobro y estado activo |
| `saving_goals` | Fondos de ahorro con meta, monto actual, tasa de rendimiento y fecha de última liquidación |

Todas las tablas incluyen `user_id` y deben tener RLS activado con políticas basadas en `auth.uid()`.

---

## 7. Instalación y Ejecución Local

No requiere compilación ni `npm install`: es un sitio estático.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/S3scobar/LUKA.git
   cd LUKA
   ```
2. Crea tu propio proyecto en [Supabase](https://supabase.com), crea las tablas de la sección 6 y activa RLS con políticas por `user_id`.
3. Edita `js/config.js` con la URL y la **anon key** de tu proyecto (nunca uses la `service_role` key en el cliente).
4. Sirve la carpeta con cualquier servidor estático (los ES Modules no funcionan abriendo el archivo directamente):
   ```bash
   npx serve .
   # o
   python3 -m http.server 8000
   ```
5. Abre `http://localhost:3000` (o `:8000`) y crea una cuenta.

### Despliegue en Vercel
Importa el repositorio en Vercel como proyecto estático, sin comando de build. El archivo `vercel.json` ya incluye la configuración necesaria.

---

## 8. Seguridad y Limitaciones Conocidas

* **Clave pública:** la `anon key` incluida en `config.js` es pública por diseño; la protección de los datos depende por completo de las políticas RLS de cada tabla, incluidas `budgets`, `credit_cards` y `credit_card_purchases`.
* **Saldos desde el cliente:** transferencias, pagos y compras de tarjeta, y el ajuste de cupo se calculan en JavaScript con varias llamadas consecutivas (leer, calcular, actualizar). Si una llamada falla a mitad del proceso, o se usa la app desde dos dispositivos a la vez, el saldo puede quedar inconsistente. Se recomienda migrar estas operaciones a funciones RPC en PostgreSQL que se ejecuten en una sola transacción.
* **Esquema no versionado:** las tablas, triggers y políticas RLS viven solo en Supabase. Conviene agregar una carpeta `supabase/` con las migraciones SQL para poder reproducir el entorno.
* **Escape de HTML:** las vistas construyen el DOM con `innerHTML`; todo texto escrito por el usuario (nombres de cuentas, categorías, metas, suscripciones, tarjetas y títulos de movimientos) pasa por `escapeHtml()` de `js/utils.js`. Al agregar nuevas plantillas, escapa cualquier texto libre del usuario.
* **Posible doble conteo en saldos (verificar):** `payCard()` y el avance en efectivo de `addPurchase()` actualizan el saldo de una billetera manualmente *y además* registran una transacción. Si en Supabase existe un trigger que ajusta el saldo al insertar transacciones, esas dos operaciones descontarían o sumarían dos veces. Conviene revisar los triggers de `transactions` y unificar el criterio.
* **Identidad del usuario:** los servicios obtienen el `user_id` con `requireUserId()` (sesión local) en lugar de `auth.getUser()`, evitando una petición de red por cada operación; la autorización real la imponen las políticas RLS.
* **Detección de pago de tarjeta:** el banner de Inicio considera una tarjeta como pagada si existe un gasto del mes cuyo título contiene «pago tarjeta» y el nombre de la tarjeta.
* **Accesibilidad:** el `viewport` actual bloquea el zoom (`user-scalable=no`).

---

## 9. Hoja de Ruta Sugerida

- [ ] Versionar el esquema SQL, los triggers y las políticas RLS.
- [ ] Mover transferencias, pagos y compras de tarjeta a funciones RPC atómicas.
- [x] Escapar el contenido dinámico antes de insertarlo con `innerHTML`.
- [x] Modo oscuro con alternador y persistencia.
- [ ] Revisar y unificar el criterio de saldos entre triggers y servicios (ver sección 8).
- [ ] Convertir la app en PWA instalable (manifest y service worker).
- [ ] Exportar movimientos a CSV.

---

## Autor

Desarrollado por **Santiago Escobar**.
