-- ============================================================
-- MIGRACIÓN: Nómina, Bitácora y Alertas
-- Fecha: 2026-06-16
-- Descripción:
--   1. Agrega columna 'validacion_status' a turnos (sin romper statusTurno existente)
--   2. Crea tabla bitacora_entries (trazabilidad de acciones)
--   3. Crea tabla alertas (sistema de alertas internas)
--   4. Crea tabla payroll_periods (periodos de corte semanal)
--   5. Crea tabla payroll_items (partidas individuales por enfermero/turno)
-- Revertir: ver sección ROLLBACK al final
-- ============================================================

-- ── FUNCIONES AUXILIARES ─────────────────────────────────────

-- Función que devuelve el rol del usuario actual (usada en RLS)
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función que verifica si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función que verifica si es admin o jefe_enfermeros
CREATE OR REPLACE FUNCTION public.is_admin_or_jefe()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('admin', 'jefe_enfermeros')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 1. ESTADOS EXTENDIDOS DE TURNO ───────────────────────────
-- Agregamos validacion_status como columna separada para no romper
-- la columna 'status' existente que el código actual usa.
-- Cuando el status sea 'completado', validacion_status toma el control del flujo.

ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS validacion_status TEXT
    DEFAULT 'pendiente'
    CHECK (validacion_status IN (
      'pendiente',       -- turno completado, aún no revisado
      'en_revision',     -- jefatura está revisando
      'validado',        -- jefatura aprobó
      'rechazado',       -- jefatura rechazó (no aplica para pago)
      'en_aclaracion'    -- requiere aclaración del enfermero
    )),
  ADD COLUMN IF NOT EXISTS horas_pagables NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS motivo_validacion TEXT,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES public.perfiles(id),
  ADD COLUMN IF NOT EXISTS validado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tarifa_costo_hora NUMERIC(10,2);

-- Índice para consultas de validación
CREATE INDEX IF NOT EXISTS idx_turnos_validacion_status
  ON public.turnos(validacion_status);

CREATE INDEX IF NOT EXISTS idx_turnos_status_validacion
  ON public.turnos(status, validacion_status);

-- ── 2. AGREGAR tarifa_costo_hora A CASOS ─────────────────────
-- Separar tarifa de cobro (al familiar) vs tarifa de costo (al enfermero)
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS tarifa_costo_hora NUMERIC(10,2);

-- ── 3. TABLA BITÁCORA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bitacora_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion          TEXT NOT NULL,
  entidad         TEXT NOT NULL,   -- nombre de la tabla: 'turnos', 'payroll_periods', etc.
  entidad_id      UUID,
  descripcion     TEXT,
  valores_previos JSONB,
  valores_nuevos  JSONB,
  motivo          TEXT,
  realizado_por   UUID REFERENCES public.perfiles(id),
  realizado_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad
  ON public.bitacora_entries(entidad, entidad_id);

CREATE INDEX IF NOT EXISTS idx_bitacora_realizado_at
  ON public.bitacora_entries(realizado_at DESC);

CREATE INDEX IF NOT EXISTS idx_bitacora_realizado_por
  ON public.bitacora_entries(realizado_por);

-- RLS: admin ve todo, jefe_enfermeros ve lo relacionado con operación
ALTER TABLE public.bitacora_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bitacora_admin_all"
  ON public.bitacora_entries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "bitacora_jefe_select"
  ON public.bitacora_entries
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_rol() = 'jefe_enfermeros'
    AND entidad IN ('turnos', 'incidencias', 'reportes_turno', 'kardex_medicamentos', 'enfermeros')
  );

CREATE POLICY "bitacora_insert_authenticated"
  ON public.bitacora_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (realizado_por = auth.uid());

-- ── 4. TABLA ALERTAS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN (
    'turno_sin_enfermero',
    'turno_sin_iniciar',
    'turno_sin_reporte',
    'turno_sin_entrega',
    'enfermero_no_confirmo',
    'reporte_pendiente',
    'incidencia_critica',
    'incidencia_grave',
    'medicamento_sin_existencia',
    'cuenta_por_cobrar_vencida',
    'pago_enfermero_proximo',
    'pago_vencido',
    'documento_por_vencer',
    'caso_margen_negativo',
    'propuesta_sin_respuesta',
    'paciente_sin_atencion',
    'corte_sin_autorizar',
    'turno_en_aclaracion',
    'otro'
  )),
  gravedad        TEXT NOT NULL DEFAULT 'media' CHECK (gravedad IN ('baja', 'media', 'alta', 'critica')),
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  entidad         TEXT,            -- nombre de la tabla relacionada
  entidad_id      UUID,            -- ID del registro relacionado
  responsable_id  UUID REFERENCES public.perfiles(id),
  estado          TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'en_proceso', 'resuelta', 'ignorada')),
  accion_sugerida TEXT,
  url_accion      TEXT,
  fecha_limite    TIMESTAMPTZ,
  resuelta_por    UUID REFERENCES public.perfiles(id),
  resuelta_at     TIMESTAMPTZ,
  dedup_key       TEXT UNIQUE,     -- clave de deduplicación para evitar alertas repetidas
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_estado
  ON public.alertas(estado);

CREATE INDEX IF NOT EXISTS idx_alertas_tipo_entidad
  ON public.alertas(tipo, entidad_id);

CREATE INDEX IF NOT EXISTS idx_alertas_responsable
  ON public.alertas(responsable_id);

CREATE INDEX IF NOT EXISTS idx_alertas_gravedad_estado
  ON public.alertas(gravedad, estado);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_admin_all"
  ON public.alertas
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "alertas_jefe_select_update"
  ON public.alertas
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_rol() = 'jefe_enfermeros'
    AND tipo IN (
      'turno_sin_enfermero', 'turno_sin_iniciar', 'turno_sin_reporte',
      'turno_sin_entrega', 'enfermero_no_confirmo', 'reporte_pendiente',
      'incidencia_critica', 'incidencia_grave', 'medicamento_sin_existencia',
      'turno_en_aclaracion'
    )
  );

CREATE POLICY "alertas_jefe_insert"
  ON public.alertas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_rol() IN ('admin', 'jefe_enfermeros'));

-- ── 5. TABLA PAYROLL_PERIODS (Periodos de corte de nómina) ───
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  TEXT NOT NULL,
  fecha_inicio            DATE NOT NULL,
  fecha_fin               DATE NOT NULL,
  fecha_corte             DATE,
  fecha_programada_pago   DATE,
  estado                  TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN (
    'borrador',
    'en_revision',
    'validado',
    'autorizado',
    'parcialmente_pagado',
    'pagado',
    'cerrado',
    'cancelado'
  )),
  total_turnos            INTEGER DEFAULT 0,
  total_horas             NUMERIC(8,2) DEFAULT 0,
  total_bruto             NUMERIC(12,2) DEFAULT 0,
  total_ajustes           NUMERIC(12,2) DEFAULT 0,
  total_pagar             NUMERIC(12,2) DEFAULT 0,
  observaciones           TEXT,
  created_by              UUID REFERENCES public.perfiles(id),
  reviewed_by             UUID REFERENCES public.perfiles(id),
  reviewed_at             TIMESTAMPTZ,
  approved_by             UUID REFERENCES public.perfiles(id),
  approved_at             TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  cancelled_by            UUID REFERENCES public.perfiles(id),
  motivo_cancelacion      TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fecha_fin_after_inicio CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_estado
  ON public.payroll_periods(estado);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_fechas
  ON public.payroll_periods(fecha_inicio, fecha_fin);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_periods_admin_all"
  ON public.payroll_periods
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "payroll_periods_jefe_select"
  ON public.payroll_periods
  FOR SELECT
  TO authenticated
  USING (public.get_user_rol() = 'jefe_enfermeros');

-- ── 6. TABLA PAYROLL_ITEMS (Partidas individuales) ───────────
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id            UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  enfermero_id          UUID NOT NULL REFERENCES public.enfermeros(id),
  turno_id              UUID REFERENCES public.turnos(id),
  caso_id               UUID REFERENCES public.casos(id),
  paciente_id           UUID REFERENCES public.pacientes(id),
  horas_programadas     NUMERIC(5,2) DEFAULT 0,
  horas_reales          NUMERIC(5,2) DEFAULT 0,
  horas_pagables        NUMERIC(5,2) DEFAULT 0,
  tarifa_hora           NUMERIC(10,2) NOT NULL DEFAULT 0,
  importe_base          NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(horas_pagables * tarifa_hora, 2)) STORED,
  horas_extra           NUMERIC(5,2) DEFAULT 0,
  tarifa_hora_extra     NUMERIC(10,2) DEFAULT 0,
  importe_extra         NUMERIC(12,2) DEFAULT 0,
  apoyo_transporte      NUMERIC(10,2) DEFAULT 0,
  bono                  NUMERIC(10,2) DEFAULT 0,
  descuento             NUMERIC(10,2) DEFAULT 0,
  ajuste                NUMERIC(10,2) DEFAULT 0,
  motivo_ajuste         TEXT,
  total_pagar           NUMERIC(12,2) DEFAULT 0,
  estado_validacion     TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_validacion IN (
    'pendiente',
    'validado',
    'rechazado',
    'en_aclaracion'
  )),
  validado_por          UUID REFERENCES public.perfiles(id),
  validado_at           TIMESTAMPTZ,
  estado_pago           TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN (
    'pendiente',
    'autorizado',
    'pagado',
    'cancelado'
  )),
  financial_expense_id  UUID REFERENCES public.financial_expenses(id),
  metodo_pago           TEXT,
  referencia_pago       TEXT,
  comprobante_url       TEXT,
  pagado_at             TIMESTAMPTZ,
  pagado_por            UUID REFERENCES public.perfiles(id),
  observaciones         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restricción crítica: un turno no puede estar en dos periodos activos simultáneamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_items_turno_activo
  ON public.payroll_items(turno_id)
  WHERE turno_id IS NOT NULL AND estado_pago != 'cancelado';

CREATE INDEX IF NOT EXISTS idx_payroll_items_periodo
  ON public.payroll_items(periodo_id);

CREATE INDEX IF NOT EXISTS idx_payroll_items_enfermero
  ON public.payroll_items(enfermero_id);

CREATE INDEX IF NOT EXISTS idx_payroll_items_turno
  ON public.payroll_items(turno_id);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_items_admin_all"
  ON public.payroll_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Jefatura puede ver items para revisar validaciones
CREATE POLICY "payroll_items_jefe_select"
  ON public.payroll_items
  FOR SELECT
  TO authenticated
  USING (public.get_user_rol() = 'jefe_enfermeros');

-- Enfermero solo ve sus propios items
CREATE POLICY "payroll_items_enfermero_select"
  ON public.payroll_items
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_rol() = 'enfermero'
    AND enfermero_id = (
      SELECT enfermero_id FROM public.perfiles WHERE id = auth.uid()
    )
  );

-- ── 7. FUNCIÓN PARA CALCULAR TOTAL DE PAYROLL_ITEM ───────────
CREATE OR REPLACE FUNCTION public.calcular_total_payroll_item()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_pagar := COALESCE(
    (NEW.horas_pagables * NEW.tarifa_hora)
    + COALESCE(NEW.importe_extra, 0)
    + COALESCE(NEW.apoyo_transporte, 0)
    + COALESCE(NEW.bono, 0)
    - COALESCE(NEW.descuento, 0)
    + COALESCE(NEW.ajuste, 0),
    0
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_total_payroll_item
  BEFORE INSERT OR UPDATE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.calcular_total_payroll_item();

-- ── 8. FUNCIÓN PARA ACTUALIZAR TOTALES DEL PERIODO ───────────
CREATE OR REPLACE FUNCTION public.actualizar_totales_periodo()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.payroll_periods
  SET
    total_turnos = (SELECT COUNT(*) FROM public.payroll_items WHERE periodo_id = COALESCE(NEW.periodo_id, OLD.periodo_id) AND estado_pago != 'cancelado'),
    total_horas  = (SELECT COALESCE(SUM(horas_pagables), 0) FROM public.payroll_items WHERE periodo_id = COALESCE(NEW.periodo_id, OLD.periodo_id) AND estado_pago != 'cancelado'),
    total_bruto  = (SELECT COALESCE(SUM(importe_base), 0) FROM public.payroll_items WHERE periodo_id = COALESCE(NEW.periodo_id, OLD.periodo_id) AND estado_pago != 'cancelado'),
    total_pagar  = (SELECT COALESCE(SUM(total_pagar), 0) FROM public.payroll_items WHERE periodo_id = COALESCE(NEW.periodo_id, OLD.periodo_id) AND estado_pago != 'cancelado'),
    updated_at   = NOW()
  WHERE id = COALESCE(NEW.periodo_id, OLD.periodo_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_totales_periodo
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_totales_periodo();

-- ── 9. ÍNDICES ADICIONALES EN TABLAS EXISTENTES ──────────────
-- Índices que pueden faltar en tablas de alta consulta

CREATE INDEX IF NOT EXISTS idx_reportes_turno_caso
  ON public.reportes_turno(caso_id);

CREATE INDEX IF NOT EXISTS idx_reportes_turno_turno
  ON public.reportes_turno(turno_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_caso
  ON public.incidencias(caso_id);

CREATE INDEX IF NOT EXISTS idx_incidencias_gravedad
  ON public.incidencias(gravedad);

CREATE INDEX IF NOT EXISTS idx_administraciones_kardex
  ON public.administraciones_medicamento(kardex_id);

CREATE INDEX IF NOT EXISTS idx_turnos_caso
  ON public.turnos(caso_id);

CREATE INDEX IF NOT EXISTS idx_turnos_enfermero
  ON public.turnos(enfermero_id);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha
  ON public.turnos(fecha_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_cobranza_caso
  ON public.cobranza_items(caso_id);

CREATE INDEX IF NOT EXISTS idx_financial_incomes_paciente
  ON public.financial_incomes(paciente_id);

CREATE INDEX IF NOT EXISTS idx_financial_expenses_enfermero
  ON public.financial_expenses(enfermero_id);

-- ── ROLLBACK MANUAL (ejecutar en caso de reversa) ────────────
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS validacion_status;
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS horas_pagables;
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS motivo_validacion;
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS validado_por;
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS validado_at;
-- ALTER TABLE public.turnos DROP COLUMN IF EXISTS tarifa_costo_hora;
-- ALTER TABLE public.casos DROP COLUMN IF EXISTS tarifa_costo_hora;
-- DROP TABLE IF EXISTS public.payroll_items;
-- DROP TABLE IF EXISTS public.payroll_periods;
-- DROP TABLE IF EXISTS public.alertas;
-- DROP TABLE IF EXISTS public.bitacora_entries;
-- DROP FUNCTION IF EXISTS public.calcular_total_payroll_item();
-- DROP FUNCTION IF EXISTS public.actualizar_totales_periodo();
-- DROP FUNCTION IF EXISTS public.get_user_rol();
-- DROP FUNCTION IF EXISTS public.is_admin_or_jefe();
