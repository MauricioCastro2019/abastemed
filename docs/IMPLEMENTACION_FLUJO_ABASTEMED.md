# Implementación del Flujo Operativo — Abastemed

> **Fecha de implementación:** 2026-06-16  
> **Versión:** 1.0

---

## Resumen Ejecutivo

Esta implementación transforma Abastemed de una colección de pantallas aisladas a un sistema operativo integral de enfermería domiciliaria. El cambio central fue introducir el flujo: **turno completado → validación jefatura → corte de nómina → pago al enfermero**, con trazabilidad completa en bitácora y alertas.

---

## Archivos Nuevos

### Base de Datos
| Archivo | Descripción |
|---|---|
| `supabase/migration_payroll_bitacora_alertas.sql` | Migración principal: 4 tablas, 3 funciones helpers, 2 triggers, índices y RLS |

### Server Actions
| Archivo | Descripción |
|---|---|
| `lib/actions/payroll.ts` | Motor de nómina: generarPartidas, autorizarPayrollPeriod, getMisPagos, getCortesActivos, getDetallePeriodo, registrarPago |
| `lib/actions/alertas.ts` | Sistema de alertas con deduplicación por `dedup_key` |
| `lib/actions/salud-sistema.ts` | Verificación de integridad: 8 chequeos de datos huérfanos o inconsistentes |

### Páginas Admin
| Archivo | Descripción |
|---|---|
| `app/(admin)/turnos/validacion/page.tsx` | Lista de turnos pendientes de validación |
| `app/(admin)/turnos/[id]/validar/page.tsx` | Wrapper server → ValidarTurnoClient |
| `app/(admin)/turnos/[id]/validar/ValidarTurnoClient.tsx` | UI completa de validación con acciones |
| `app/(admin)/cortes/page.tsx` | Dashboard de cortes (activos + historial) |
| `app/(admin)/cortes/nuevo/page.tsx` | Formulario creación de periodo con fechas auto-sugeridas |
| `app/(admin)/cortes/[id]/page.tsx` | Wrapper server → CorteDetalleClient |
| `app/(admin)/cortes/[id]/CorteDetalleClient.tsx` | UI completa de gestión del corte: máquina de estados, partidas, pagos |
| `app/(admin)/salud-sistema/page.tsx` | Pantalla de integridad del sistema |

### Páginas Enfermero
| Archivo | Descripción |
|---|---|
| `app/(enfermero)/mis-pagos/page.tsx` | Portal de pagos agrupados por periodo |

### Documentación
| Archivo | Descripción |
|---|---|
| `docs/AUDITORIA_FLUJO_ABASTEMED.md` | Auditoría completa: inventario de módulos, Mermaid, matriz de integración, 15 riesgos técnicos, plan por fases |
| `docs/FLUJO_OPERATIVO_ABASTEMED.md` | Flujo operativo integral: diagramas, etapas, estados, reglas, permisos |
| `docs/IMPLEMENTACION_FLUJO_ABASTEMED.md` | Este documento |

---

## Archivos Modificados

### `lib/actions/bitacora.ts`
- Agregada función `registrarEvento()` — escritura real en tabla `bitacora_entries`
- Agregada función `getBitacoraEntradas()` y `getBitacoraEntradaPorEntidad()`
- Las funciones legacy `getBitacoraGlobal()` y `getBitacoraPorCaso()` se preservaron intactas

### `lib/actions/turnos.ts`
- Importados: `registrarEvento`, `crearAlerta`, `TurnoConValidacion`
- Función `cambiarStatusTurno()` modificada: al completar un turno ahora calcula horas automáticamente, usa locale `es-MX`, registra en bitácora y crea alerta de validación
- Nuevas funciones exportadas: `getTurnosPendientesValidacion()`, `getTurnoConValidacion()`, `validarTurno()`

### `types/index.ts`
- Nuevo tipo: `ValidacionStatusTurno`
- Nuevas interfaces: `EstadoPayrollPeriod`, `PayrollPeriod`, `PayrollItem`, `ResumenPagoEnfermero`, `BitacoraEntry`, `TipoAlerta`, `GravedadAlerta`, `EstadoAlerta`, `Alerta`, `GravedadProblema`, `ProblemaIntegridad`, `ResumenSaludSistema`, `TurnoConValidacion`

### `components/admin/Sidebar.tsx`
- Iconos agregados: `CheckSquare`, `Wallet`, `Activity`
- Ítems en NAV_ADMIN: `/turnos/validacion`, `/cortes`, `/salud-sistema`
- Ítems en NAV_JEFE: `/turnos/validacion`, `/cortes`

### `components/enfermero/SidebarEnfermero.tsx`
- Icono `Wallet` agregado
- Ítem: `/enfermero/mis-pagos`

### `lib/supabase/middleware.ts`
- Prefijos protegidos agregados: `/finanzas`, `/cortes`, `/bitacora`, `/levantamientos`, `/insumos`, `/agenda-cuidado`, `/salud-sistema`

---

## Migraciones de Base de Datos

### Archivo: `supabase/migration_payroll_bitacora_alertas.sql`

#### Extensiones a tabla `turnos`
```sql
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS validacion_status TEXT DEFAULT 'pendiente'
    CHECK (validacion_status IN ('pendiente','en_revision','validado','rechazado','en_aclaracion')),
  ADD COLUMN IF NOT EXISTS horas_pagables NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS motivo_validacion TEXT,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES public.perfiles(id),
  ADD COLUMN IF NOT EXISTS validado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tarifa_costo_hora NUMERIC(10,2);
```

#### Extensiones a tabla `casos`
```sql
ALTER TABLE public.casos ADD COLUMN IF NOT EXISTS tarifa_costo_hora NUMERIC(10,2);
```

#### Tabla `bitacora_entries` (nueva)
```sql
CREATE TABLE IF NOT EXISTS public.bitacora_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion         TEXT NOT NULL,
  entidad        TEXT,
  entidad_id     TEXT,
  descripcion    TEXT,
  motivo         TEXT,
  metadata       JSONB DEFAULT '{}',
  realizado_por  UUID REFERENCES public.perfiles(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

#### Tabla `alertas` (nueva)
```sql
CREATE TABLE IF NOT EXISTS public.alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL,
  gravedad        TEXT NOT NULL CHECK (gravedad IN ('critica','alta','media','baja')),
  estado          TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','en_proceso','resuelta','descartada')),
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  entidad         TEXT,
  entidad_id      TEXT,
  accion_sugerida TEXT,
  url_accion      TEXT,
  dedup_key       TEXT UNIQUE,  -- previene alertas duplicadas
  ...
);
```

#### Tabla `payroll_periods` (nueva)
```sql
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                   TEXT NOT NULL,
  fecha_inicio             DATE NOT NULL,
  fecha_fin                DATE NOT NULL,
  fecha_programada_pago    DATE,
  estado                   TEXT NOT NULL DEFAULT 'borrador',
  total_turnos             INTEGER DEFAULT 0,
  total_horas              NUMERIC(8,2) DEFAULT 0,
  total_pagar              NUMERIC(12,2) DEFAULT 0,
  ...
);
```

#### Tabla `payroll_items` (nueva)
```sql
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id            UUID NOT NULL REFERENCES public.payroll_periods(id),
  enfermero_id          UUID NOT NULL REFERENCES public.enfermeros(id),
  turno_id              UUID REFERENCES public.turnos(id),
  horas_pagables        NUMERIC(5,2) NOT NULL,
  tarifa_hora           NUMERIC(10,2) NOT NULL,
  total_pagar           NUMERIC(12,2) GENERATED ALWAYS AS (horas_pagables * tarifa_hora) STORED,
  estado_pago           TEXT NOT NULL DEFAULT 'pendiente',
  financial_expense_id  UUID REFERENCES public.financial_expenses(id),
  ...
);

-- Protección anti-doble-pago:
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_items_turno_activo
  ON public.payroll_items(turno_id)
  WHERE turno_id IS NOT NULL AND estado_pago != 'cancelado';
```

### Cómo ejecutar la migración

**Opción A — Supabase Dashboard:**
1. Ir a Dashboard → SQL Editor
2. Pegar contenido de `supabase/migration_payroll_bitacora_alertas.sql`
3. Ejecutar

**Opción B — CLI:**
```bash
supabase db push
```

**Opción C — psql directo:**
```bash
psql "$DATABASE_URL" -f supabase/migration_payroll_bitacora_alertas.sql
```

### Rollback
```sql
-- Revertir en orden inverso a dependencias:
DROP TABLE IF EXISTS public.payroll_items CASCADE;
DROP TABLE IF EXISTS public.payroll_periods CASCADE;
DROP TABLE IF EXISTS public.alertas CASCADE;
DROP TABLE IF EXISTS public.bitacora_entries CASCADE;
ALTER TABLE public.turnos
  DROP COLUMN IF EXISTS validacion_status,
  DROP COLUMN IF EXISTS horas_pagables,
  DROP COLUMN IF EXISTS motivo_validacion,
  DROP COLUMN IF EXISTS validado_por,
  DROP COLUMN IF EXISTS validado_at,
  DROP COLUMN IF EXISTS tarifa_costo_hora;
ALTER TABLE public.casos DROP COLUMN IF EXISTS tarifa_costo_hora;
```

---

## Variables de Entorno Requeridas

No se requieren variables de entorno nuevas. Las siguientes ya deben estar configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Rutas Implementadas

| Ruta | Tipo | Rol requerido | Descripción |
|---|---|---|---|
| `/turnos/validacion` | Server Page | admin, jefe_enfermeros | Lista de turnos pendientes de validación |
| `/turnos/[id]/validar` | Server + Client | admin, jefe_enfermeros | UI de validación de un turno |
| `/cortes` | Server Page | admin, jefe_enfermeros | Dashboard de cortes de nómina |
| `/cortes/nuevo` | Client Page | admin, jefe_enfermeros | Crear nuevo periodo de corte |
| `/cortes/[id]` | Server + Client | admin, jefe_enfermeros | Detalle y gestión de corte |
| `/salud-sistema` | Server Page | admin | Chequeos de integridad del sistema |
| `/enfermero/mis-pagos` | Server Page | enfermero | Portal de pagos del enfermero |

---

## Fixes Técnicos Aplicados

### 1. Locale `es-VE` → `es-MX`
Todos los `toLocaleDateString('es-VE', ...)` y `toLocaleString('es-VE', ...)` en código nuevo usan `'es-MX'`.

### 2. Tipos Supabase con joins como arrays
Supabase devuelve las relaciones como arrays cuando se usa `.select('relacion:tabla(...)')`. Todos los joins nuevos se manejan con:
```typescript
const item = Array.isArray(data.relacion) ? data.relacion[0] : data.relacion
```

### 3. Map/Set con `--downlevelIteration`
Para evitar el error de TypeScript al iterar Maps y Sets sin `downlevelIteration` en el `tsconfig`, se usa:
```typescript
// En lugar de: for (const [k, v] of map.entries())
for (const [k, v] of Array.from(map.entries())) { ... }
// En lugar de: [...new Set(arr)]
Array.from(new Set(arr))
```

### 4. Columna `total_pagar` generada (STORED)
La columna `payroll_items.total_pagar` es GENERATED ALWAYS AS (`horas_pagables * tarifa_hora`). No se puede insertar directamente — el trigger la calcula automáticamente.

### 5. Bitácora no-bloqueante
`registrarEvento()` está envuelto en try/catch y nunca lanza excepciones. Si la bitácora falla, la operación principal continúa.

---

## Pasos de Prueba

### Flujo completo de un turno pagado

1. **Crear turno** en `/turnos/nuevo` con enfermero y fechas
2. **Completar turno** → cambiar status a `completado`
3. **Verificar** que se creó un `cobranza_items` automáticamente
4. **Registrar reporte** en `/turnos/[id]/reporte`
5. **Validar turno** en `/turnos/[id]/validar` → validar
6. **Crear corte** en `/cortes/nuevo` con fechas que incluyan el turno
7. **Generar partidas** en el corte → verificar que el turno aparece
8. **Enviar a revisión** → cambiar estado a `en_revision`
9. **Marcar validado** → cambiar estado a `validado`
10. **Autorizar corte** (solo admin) → verificar creación de `financial_expenses`
11. **Registrar pago** → verificar estado `pagado` en items y periodo
12. **Enfermero verifica** en `/enfermero/mis-pagos` → debe ver el turno pagado

### Prueba de deduplicación de alertas
1. Completar un turno → se crea alerta `turno_sin_reporte` con `dedup_key = turno_validacion_{id}`
2. Completar el mismo turno de nuevo (o llamar manualmente) → la alerta NO se duplica

### Prueba de doble-pago
1. Incluir un turno en un corte → `payroll_items` creado
2. Intentar incluir el mismo turno en otro corte → debe fallar con error de UNIQUE constraint

### Prueba de rol
1. Loguear como `jefe_enfermeros`
2. Intentar ir a `/salud-sistema` → debe redirigir (solo admin)
3. Ir a `/turnos/validacion` → debe funcionar
4. En `/cortes/[id]`, verificar que el botón "Autorizar corte" no está disponible

---

## Flujos Pendientes (Siguiente Iteración)

| Flujo | Prioridad | Descripción |
|---|---|---|
| Dashboard operativo conectado | Alta | Indicadores reales de turnos, cobranza, pagos, alertas en tiempo real |
| Motor de indicadores por paciente | Media | Rentabilidad por caso, costo acumulado, ingreso acumulado |
| Portal familiar renovado | Media | Ver reportes resumidos, recibos, pagos, mensajes |
| Exportación de corte a PDF/Excel | Media | Para registros contables externos |
| Notificaciones por email/WhatsApp | Baja | Avisos automáticos al enfermero sobre pagos |
| RPC para verificación de ingresos vencidos | Baja | Check #5 de salud-sistema que fue omitido |

---

## Riesgos Conocidos

| Riesgo | Descripción | Mitigación |
|---|---|---|
| RLS no verificado en producción | Las políticas se definen en el SQL pero dependen de la función `get_user_rol()` funcionando correctamente | Probar con un usuario de cada rol antes de usar en producción |
| `tarifa_costo_hora` sin valor | Si un caso no tiene `tarifa_costo_hora`, `payroll.ts` usa 60% de la tarifa de cobro como estimado | Completar el campo en todos los casos activos antes de generar cortes |
| Incidencias sin campo `gravedad` | Si la tabla `incidencias` no tiene columna `gravedad`, el check de salud-sistema fallará | Verificar que la columna existe en la BD antes de ejecutar `/salud-sistema` |
| Corte con turnos de fechas distintas | El corte no valida que los turnos estén en el rango de fechas del periodo — solo filtra por `validacion_status` | Definir si el rango es restrictivo o solo orientativo en futuras iteraciones |
