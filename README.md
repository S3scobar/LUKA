# LUKA — Sistema de Gestión Financiera Personal

LUKA es una aplicación web progresiva orientada a la administración de finanzas personales, trazabilidad de gastos cotidianos, conciliación de cuentas y control de fondos de ahorro. El sistema está construido bajo una arquitectura cliente liviana basada en estándares web nativos (HTML5, CSS3, JavaScript ES Modules) y respaldada por Supabase (PostgreSQL, Row Level Security y funciones PL/pgSQL).

---

## 1. Contexto y Planteamiento del Problema

La mayoría de las aplicaciones de finanzas personales fracasan por una razón recurrente: **la fricción en el registro**. Los flujos convencionales requieren navegar entre múltiples pantallas, abrir listas desplegables anidadas, seleccionar fechas y confirmar formularios extensos. Esta sobrecarga operativa provoca que el usuario abandone el registro a los pocos días, perdiendo la trazabilidad de sus gastos hormiga.

Adicionalmente, los usuarios suelen enfrentar tres problemas estructurales:
1. **Descentralización de cuentas:** El dinero se encuentra fragmentado en efectivo, cuentas bancarias y billeteras digitales (como Nequi o Nu), dificultando saber con precisión el saldo real en cada una.
2. **Fuga por suscripciones fijas:** Dificultad para auditar qué pagos periódicos (telefonía, servicios, membresías) han sido debitados y cuáles siguen pendientes en el ciclo mensual en curso.
3. **Falta de visibilidad del ahorro:** Ausencia de distinción entre el capital operativo corriente y los fondos o metas de ahorro acumulados ("dónde está realmente guardado el dinero").

---

## 2. Propuesta de Solución y Filosofía de Diseño

LUKA fue concebida bajo los siguientes principios de ingeniería y experiencia de usuario (UX):

* **Interacción de registro en un solo toque (One-Tap Categorization):** El formulario principal reduce los pasos al mínimo indispensable: un campo para el concepto, un campo numérico para el monto y acceso directo a las cuatro categorías más frecuentes del usuario. Al seleccionar la categoría, el movimiento se persiste en base de datos de manera atómica, descontando el saldo de la billetera correspondiente sin pantallas intermedias.
* **Integridad transaccional a nivel de base de datos:** En lugar de calcular saldos únicamente en el cliente, la lógica contable se delega a disparadores (*triggers*) en PostgreSQL. Cualquier inserción o eliminación de movimientos actualiza de forma síncrona el saldo de la billetera afectada.
* **Aislamiento y seguridad multi-inquilino:** Implementación estricta de políticas de seguridad por fila (*Row Level Security - RLS*). Toda consulta está acotada al identificador criptográfico del usuario autenticado (`auth.uid() = user_id`), impidiendo cualquier acceso no autorizado entre cuentas.
* **Cero dependencias pesadas en frontend:** Se prescinde intencionalmente de frameworks complejos (React, Vue o Angular) y herramientas de empaquetado (*bundlers*). El proyecto utiliza ES Modules nativos para garantizar tiempos de carga inicial inferiores a un segundo y máxima portabilidad.

---

## 3. Módulos del Sistema

### 3.1. Núcleo Transaccional y Registro Rápido
* Captura inmediata de gastos e ingresos.
* Acceso con un clic a las 4 categorías preferenciales configuradas por el usuario.
* Selector modal de categorías secundarias para consumos eventuales.
* Selección explícita de la cuenta o billetera de origen/destino.

### 3.2. Gestión de Billeteras
* Soporte para múltiples cuentas (efectivo, bancos, tarjetas, billeteras electrónicas).
* Conciliación y ajuste manual de saldos en caso de discrepancias físicas.
* Trazabilidad de saldo disponible en tiempo real.

### 3.3. Ciclo de Suscripciones y Pagos Fijos
* Programación de pagos recurrentes vinculados a un día específico del mes.
* Evaluación dinámica de estado (*Pendiente* vs. *Pagada*): el sistema audita las transacciones del mes en curso para verificar si el pago ya fue emitido.
* Transición de ciclo mensual automatizada: el estado se reinicia a *Pendiente* el primer día de cada mes calendario sin requerir tareas programadas en el servidor.
* Conciliación con un clic: marcar un pago recurrente como pagado genera automáticamente el gasto correspondiente y descuenta el saldo de la cuenta elegida.

### 3.4. Bóvedas y Fondos de Ahorro
* Segregación entre saldo operativo y saldo de ahorro acumulado.
* Registro de fondos con o sin meta fija (fondo de emergencia, viajes, metas específicas).
* Registro de aportes periódicos con descuento directo sobre la billetera seleccionada.

### 3.5. Analítica y Reportes
* **Consolidado mensual:** Cálculo de ingresos totales, egresos totales y balance neto del periodo.
* **Desglose de gastos por categoría:** Distribución porcentual y monto acumulado por rubro, con identificación de la categoría de mayor impacto financiero.
* **Consolidado anual (12 meses):** Comparativa mes a mes de ingresos vs. egresos para evaluación de tendencias y capacidad de ahorro anual.
* **Filtro temporal interactivo:** Navegación hacia atrás y adelante entre meses y años.

---

## 4. Arquitectura de Software y Stack Tecnológico

### Capa Cliente (Frontend)
* **Lenguajes:** HTML5 semántico, CSS3 estructurado mediante variables y diseño responsivo, JavaScript Vanilla (ECMAScript 6+).
* **Modularización:** Arquitectura desacoplada dividida en servicios (`/js/services`), componentes reutilizables (`/js/components`) y controladores de vista (`/js/views`).
* **Iconografía:** FontAwesome 6 vía CDN.

### Capa de Datos y Servicios (Backend as a Service)
* **Plataforma:** Supabase.
* **Motor de base de datos:** PostgreSQL 15+.
* **Seguridad:** Row Level Security (RLS) habilitado en el 100% de las tablas relacionales.
* **Lógica procedural:** Triggers y funciones en PL/pgSQL para auditoría de balances y aprovisionamiento inicial de usuario.
* **Autenticación:** Supabase Auth vía JSON Web Tokens (JWT).

### Infraestructura y Despliegue
* **Control de versiones:** Git / GitHub.
* **Plataforma de despliegue:** Vercel (distribución perimetral de activos estáticos con configuración de reescritura de rutas para SPA).

---

## 5. Estructura del Directorio

```text
├── index.html                  # Punto de entrada y enrutamiento SPA
├── vercel.json                 # Configuración de reescritura de rutas para Vercel
├── .gitignore                  # Exclusiones de control de versiones
├── README.md                   # Documentación técnica del proyecto
├── css/
│   ├── main.css                # Variables de diseño, reset y tipografía base
│   ├── components.css          # Estilos de botones, tarjetas, modales y formularios
│   └── views.css               # Estilos de métricas, historial, reportes y fondos
└── js/
    ├── config.js               # Parámetros de configuración del cliente Supabase
    ├── supabaseClient.js       # Inicialización del cliente Supabase JS (ESM)
    ├── services/
    │   ├── authService.js      # Operaciones de autenticación y sesión
    │   ├── walletService.js    # Capa de datos para billeteras y saldos
    │   ├── categoryService.js  # Capa de datos para categorías y favoritas
    │   ├── transactionService.js # Capa de datos para transacciones y métricas
    │   ├── subscriptionService.js# Capa de datos para pagos fijos recurrentes
    │   └── goalService.js      # Capa de datos para fondos de ahorro y aportes
    └── views/
        ├── authView.js         # Vista de autenticación (login y registro)
        ├── dashboardView.js    # Vista principal (registro rápido, balance e historial)
        ├── walletsView.js      # Vista de administración de cuentas y categorías
        ├── subscriptionsView.js# Vista de control de pagos fijos mensuales
        ├── savingsView.js      # Vista de fondos de ahorro acumulados
        └── analyticsView.js    # Vista de reportes mensuales y balance anual