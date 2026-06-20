# Abastemed — Sistema Operativo de Enfermería Domiciliaria

Plataforma SaaS para la gestión integral de servicios de enfermería a domicilio. Administra prospectos, pacientes, turnos, reportes clínicos, cobranza, nómina de enfermeros y salud del sistema desde un único lugar.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router, Server Components, Server Actions) |
| Base de datos | Supabase (PostgreSQL + Auth + Row Level Security) |
| Tipado | TypeScript estricto + Zod para validación |
| UI | Tailwind CSS + shadcn/ui |
| Despliegue | Vercel |

**Colores de marca:** `#1B2B4B` (navy) · `#2AABBF` (teal)

---

## Instalación

```bash
git clone <repo>
cd abastemed
npm install
cp .env.local.example .env.local   # completar variables
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Migraciones de Base de Datos

Ejecutar en orden en el SQL Editor de Supabase o con el CLI:

```bash
# Con CLI
supabase db push

# Con psql
psql "$DATABASE_URL" -f supabase/migration_payroll_bitacora_alertas.sql
```

Ver [`docs/IMPLEMENTACION_FLUJO_ABASTEMED.md`](docs/IMPLEMENTACION_FLUJO_ABASTEMED.md) para instrucciones detalladas y rollback.

---

## Roles y Permisos

| Rol | Acceso |
|---|---|
| `admin` | Acceso completo. Autoriza y ejecuta pagos. Ve rentabilidad y salud del sistema. |
| `jefe_enfermeros` | Valida turnos, revisa cortes, gestiona incidencias. No puede pagar. |
| `enfermero` | Solo ve sus propios turnos, reportes y pagos. |
| `familiar` | Portal propio mobile-first: reportes resumidos, medicamentos, agenda, cobranza y contacto directo con el equipo. |

---

## Módulos

### Comercial
- **Prospectos** — Registro de solicitudes de servicio
- **Levantamientos** — Wizard de 10 pasos: evaluación física, clínica, operativa, datos comerciales
- **Cotizador** — Motor de score (0–100+) + cálculo automático de precio
- **Propuestas** — Generación de documentos para la familia

### Operativo
- **Pacientes** — Expediente completo: diagnóstico, medicamentos, alergias, contacto familiar
- **Casos** — Servicio activo vinculando paciente, enfermero, tarifas y horarios
- **Turnos** — Programación, ejecución y seguimiento de turnos
- **Reportes de turno** — Signos vitales, medicamentos administrados, estado general
- **Entregas de turno** — Continuidad entre enfermeros
- **Plan de cuidado** — Indicaciones médicas con frecuencia y horarios
- **Kardex** — Control de medicamentos activos del paciente
- **Incidencias** — Registro y seguimiento de eventos clínicos relevantes

### Nómina
- **Validación de turnos** (`/turnos/validacion`) — Jefatura revisa y valida turnos completados
- **Cortes de nómina** (`/cortes`) — Periodos semanales con partidas por enfermero
- **Mis pagos** (`/enfermero/mis-pagos`) — Portal de pagos del enfermero

### Cobranza y Finanzas
- **Cobranza** — Items por turno generados automáticamente
- **Recibos** — Documentos de cobro al familiar
- **Finanzas** — Ingresos (`financial_incomes`) y egresos (`financial_expenses`) con balance

### Portal Familiar

Módulo mobile-first independiente bajo `/familiar/*`. Acceso restringido exclusivamente al rol `familiar`.

| Ruta | Descripción |
|---|---|
| `/familiar/dashboard` | Resumen: estado del paciente, alertas, último reporte, medicamentos activos, agenda próxima y saldo pendiente |
| `/familiar/evolucion` | Timeline de reportes de turno visibles (signos vitales, alimentación, cuidados, incidencias) |
| `/familiar/medicamentos` | Kardex activo y suspendido con próxima toma calculada |
| `/familiar/agenda` | Vista 8 días unificando turnos, indicaciones y citas médicas |
| `/familiar/cobranza` | Historial de cargos/pagos con resumen y botón de reporte por WhatsApp |
| `/familiar/contacto` | Llamada directa, WhatsApp y formulario de solicitud con validación Zod |
| `/familiar/expediente` | Datos del paciente, caso activo y plan de cuidado |
| `/familiar/configuracion` | Perfil, cambio de contraseña y cierre de sesión |

**Seguridad del portal familiar:**
- Middleware redirige cualquier rol no-familiar que intente acceder a `/familiar/*`
- Server Actions validan `rol === 'familiar'` con `getContextoFamiliar()` antes de cualquier consulta
- Acceso a paciente verificado en dos capas: tabla `familiar_paciente` (nueva) + `perfiles.paciente_id` (compatibilidad)
- IDs de paciente nunca provienen del cliente — se resuelven desde el perfil autenticado en el servidor
- Incidencias visibles solo cuando `visible_para_familia = TRUE` (requiere activación explícita por admin)

**Nuevas tablas DB para el portal:**

| Tabla | Descripción |
|---|---|
| `familiar_paciente` | Relación M:M con permisos JSONB granulares por paciente |
| `citas_medicas` | Citas programadas del paciente (médico, especialidad, fecha, preparación) |
| `solicitudes_familia` | Mensajes y solicitudes enviadas por el familiar al equipo |

Migración: [`supabase/migration_portal_familiar.sql`](supabase/migration_portal_familiar.sql)

### Sistema
- **Bitácora** — Registro persistente de todas las acciones críticas
- **Alertas** — Sistema de alertas con deduplicación por `dedup_key`
- **Salud del sistema** (`/salud-sistema`) — 8 chequeos de integridad de datos

---

## Arquitectura

```
app/
  (admin)/          # Rutas de admin y jefatura
    turnos/
      validacion/   # Lista turnos pendientes
      [id]/validar/ # UI de validación
    cortes/         # Gestión de nómina
    salud-sistema/  # Integridad del sistema
    ...
  (enfermero)/      # Rutas del enfermero
    mis-pagos/
    ...
  (familiar)/       # Portal Familiar (mobile-first, rol familiar)
    familiar/
      dashboard/    # Resumen integral del paciente
      evolucion/    # Timeline de reportes
      medicamentos/ # Kardex + administraciones
      agenda/       # Turnos + indicaciones + citas unificadas
      cobranza/     # Historial de pagos
      contacto/     # Formulario + llamada/WhatsApp
      expediente/   # Datos clínicos del paciente
      configuracion/
lib/
  actions/          # Server Actions (lógica de negocio)
    bitacora.ts
    alertas.ts
    payroll.ts
    salud-sistema.ts
    turnos.ts
    ...
  supabase/         # Cliente y middleware
  validations/      # Schemas Zod
components/
  admin/            # Componentes compartidos de admin
  enfermero/
  ui/               # shadcn/ui
types/
  index.ts          # Tipos globales TypeScript
supabase/
  migration_*.sql               # Migraciones de BD
  migration_portal_familiar.sql # Portal Familiar: tablas, RLS, funciones helper
docs/
  AUDITORIA_FLUJO_ABASTEMED.md
  FLUJO_OPERATIVO_ABASTEMED.md
  IMPLEMENTACION_FLUJO_ABASTEMED.md
```

---

## Flujo Operativo Principal

```
Prospecto → Evaluación → Cotización → Paciente → Caso
                                                   │
                                              Turno Programado
                                                   │
                                              Turno Activo
                                                   │
                                              Turno Completado ──→ Cobranza auto
                                                   │
                                          Reporte + Entrega
                                                   │
                                      Validación Jefatura (Dani)
                                                   │
                                              Validado
                                                   │
                                           Corte Semanal
                                                   │
                                       Autorización Admin (Mauricio)
                                                   │
                                          Pago al Enfermero
```

Ver [`docs/FLUJO_OPERATIVO_ABASTEMED.md`](docs/FLUJO_OPERATIVO_ABASTEMED.md) para el diagrama completo con todos los módulos.

---

## Comandos de Desarrollo

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # ESLint
npm run type-check # TypeScript (npx tsc --noEmit)
```

---

## Despliegue

El proyecto está configurado para Vercel con Next.js App Router.

```bash
vercel --prod
```

Variables de entorno requeridas en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## Seguridad

- **Row Level Security (RLS)** activado en todas las tablas de Supabase
- **Rutas protegidas** por middleware de Next.js según rol
- **Server Actions** validan rol en cada operación crítica (`requireRole()`)
- **Sin secrets en cliente** — la `SERVICE_ROLE_KEY` solo se usa en Server Actions
- **Doble validación** — las operaciones de pago requieren autorización explícita del admin
- **Portal Familiar aislado** — IDs resueltos desde el servidor, nunca del cliente; RLS con función `SECURITY DEFINER` para evitar recursión
- **RBAC por capa** — middleware + server actions + RLS en DB (triple barrera)

---

## Documentación Adicional

- [`docs/AUDITORIA_FLUJO_ABASTEMED.md`](docs/AUDITORIA_FLUJO_ABASTEMED.md) — Auditoría técnica completa con riesgos identificados
- [`docs/FLUJO_OPERATIVO_ABASTEMED.md`](docs/FLUJO_OPERATIVO_ABASTEMED.md) — Flujo operativo, estados, reglas y permisos
- [`docs/IMPLEMENTACION_FLUJO_ABASTEMED.md`](docs/IMPLEMENTACION_FLUJO_ABASTEMED.md) — Cambios implementados, migraciones, pasos de prueba
