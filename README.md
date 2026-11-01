# LUKA

Aplicación web de finanzas personales: registro de gastos e ingresos, cuentas, presupuestos por categoría, tarjetas de crédito, suscripciones y fondos de ahorro. Es un sitio estático (HTML, CSS y JavaScript con módulos ES) que usa Supabase para la base de datos y la autenticación, y se despliega en Vercel.

---

## 1. Qué resuelve

* Registrar un gasto con un solo toque, sin pantallas intermedias.
* Ver el saldo de cada cuenta (efectivo, bancos, billeteras digitales) en un solo lugar.
* Saber qué pagos fijos del mes ya se hicieron.
* Separar el dinero de uso diario del dinero ahorrado.
* Entender cuánto se debe en tarjetas, con cuotas, intereses y fecha de pago.

## 2. Decisiones de diseño

* **Sin framework ni bundler:** ES Modules nativos y dos dependencias por CDN (Font Awesome y `supabase-js`).
* **Aislamiento entre usuarios con RLS:** cada fila tiene `user_id` y las políticas limitan el acceso a `auth.uid() = user_id` (ver `supabase/schema.sql`).
* **Saldos coherentes:** el trigger `tr_transaction_balance` ajusta el saldo de la billetera al crear o borrar una transacción, por lo que el código no lo toca a mano en esos casos. Para el cupo de las tarjetas y las transferencias, `walletService.adjustBalance()` usa funciones RPC atómicas (`supabase/functions.sql`); si no están desplegadas, lee y escribe.
* **Móvil primero:** pestañas deslizables, montos con separador de miles (`es-CO`) y tutorial en el primer ingreso.
* **Tema claro y oscuro:** los colores salen de variables CSS en `css/main.css`; el tema oscuro solo las redefine.

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
* Guía paso a paso por cada pestaña (Inicio, Billeteras, Presupuesto, Tarjetas, Suscripciones, Ahorros y Análisis), disponible desde un botón flotante.

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
├── supabase/
│   ├── schema.sql                  # Tablas, RLS y triggers (referencia del esquema actual)
│   ├── indexes.sql                 # Índices por usuario y por fecha
│   └── functions.sql               # Ajustes de saldo y transferencias atómicas
├── css/
│   ├── main.css                    # Tokens de diseño (tema claro y oscuro), reset y tipografía
│   ├── components.css              # Botones, tarjetas, modales y formularios
│   └── views.css                   # Estilos específicos de cada vista
└── js/
    ├── main.js                     # Punto de entrada: sesión, navegación entre vistas y tema
    ├── config.js                   # URL y clave pública (anon) de Supabase
    ├── supabaseClient.js           # Cliente Supabase, requireUserId() e isMissingRpc()
    ├── themeManager.js             # Tema claro/oscuro: preferencia, persistencia y botón
    ├── utils.js                    # escapeHtml(), resolveContainer() y notifyError()
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

El código consume las siguientes tablas de Supabase. Las políticas RLS, los índices y las funciones están en `supabase/`; las tablas en sí no están versionadas:

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

## 8. Varios usuarios a la vez

* **Datos:** cada usuario solo ve sus filas gracias a RLS. `supabase/schema.sql` define las políticas de las nueve tablas; confirma en el panel de Supabase que todas tienen RLS activo. Ejecuta `supabase/indexes.sql`: las políticas filtran por `user_id` en cada consulta y sin índices la base se vuelve más lenta con cada usuario nuevo.
* **Saldos:** dos pestañas o dispositivos del mismo usuario pueden modificar una cuenta a la vez. Con `supabase/functions.sql` desplegado, el ajuste es una sola sentencia SQL y no se pierde ninguna actualización.
* **Sesión compartida entre pestañas:** `supabase-js` guarda la sesión en `localStorage`. Si en otra pestaña se cierra sesión o entra otro usuario, esta pestaña vuelve al login o recarga los datos del usuario nuevo; no sigue mostrando los del anterior.
* **Estado en pantalla:** al cambiar de usuario se reinician los filtros de mes, la tarjeta seleccionada y la pestaña activa.
* **Respuestas tardías:** cada pestaña se pinta en su propio contenedor, así una consulta lenta no sobrescribe la pestaña que el usuario abrió después.
* **Volumen:** las consultas de movimientos se piden por páginas de 1000 filas (el máximo de Supabase por petición).

## 9. Seguridad y limitaciones

* **Clave pública:** la `anon key` de `config.js` es pública por diseño; la protección depende de las políticas RLS.
* **Fondos de ahorro:** aportes y retiros siguen leyendo y escribiendo `saving_goals.current_amount` en pasos separados; falta una función RPC como la de las billeteras.
* **Compras con tarjeta:** registrar una compra implica varias llamadas (compra, cupo, transacción). Si una falla a mitad, los datos pueden quedar a medias. Lo ideal es una función SQL que haga todo en una transacción.
* **Pagos de tarjeta y avances anteriores:** hasta esta versión `payCard()` y el avance de `addPurchase()` ajustaban el saldo a mano y además el trigger lo ajustaba al registrar la transacción, así que el movimiento se contaba dos veces. Ya no ocurre, pero los saldos de pagos y avances hechos antes pueden estar desviados: corrígelos con el lápiz de editar en Billeteras.
* **Correo sin verificar:** el trigger `auto_confirm_user` confirma cualquier correo al registrarse, por lo que nadie comprueba que el correo sea real. Es cómodo, pero no comprueba que el correo pertenezca a quien se registra.
* **Pago de suscripciones y tarjetas:** se detecta por el texto del título del movimiento («Pago: nombre», «Pago Tarjeta: nombre»). Si el usuario edita ese texto, el estado cambia.
* **Escape de HTML:** el texto escrito por el usuario pasa por `escapeHtml()` antes de entrar a una plantilla. Al agregar vistas nuevas, haz lo mismo.
* **Accesibilidad:** el `viewport` bloquea el zoom (`user-scalable=no`).
* **Versión de `supabase-js`:** se carga `@2` sin fijar versión; conviene fijar una versión exacta.

---

## 10. Pendiente

- [ ] Mover aportes de ahorro y compras con tarjeta a funciones RPC.
- [ ] Fijar la versión de `supabase-js`.
- [ ] PWA instalable.
- [ ] Exportar movimientos a CSV.

---

## Autor

Desarrollado por **Santiago Escobar**.
