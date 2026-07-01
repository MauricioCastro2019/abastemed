-- ============================================================
-- MIGRACIÓN: Módulo Financiero — Abastemed
-- Ejecutar en Supabase SQL Editor
-- Requiere: migración base (perfiles, pacientes, casos, enfermeros)
-- ============================================================

-- ============================================================
-- FUNCIÓN: is_admin (solo admin ve/edita finanzas)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
      AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLA: Ingresos financieros
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_incomes (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio                     TEXT NOT NULL UNIQUE,
  fecha_pago                DATE NOT NULL,
  paciente_id               UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  caso_id                   UUID REFERENCES casos(id) ON DELETE SET NULL,
  responsable_pago_nombre   TEXT NOT NULL,
  responsable_pago_contacto TEXT,
  concepto                  TEXT NOT NULL,
  tipo_ingreso              TEXT NOT NULL DEFAULT 'pago_servicio',
  periodo_cubierto_inicio   DATE,
  periodo_cubierto_fin      DATE,
  fecha_limite_pago         DATE,
  monto_total               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
  monto_recibido            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0),
  metodo_pago               TEXT NOT NULL DEFAULT 'efectivo',
  cuenta_receptora          TEXT,
  referencia_pago           TEXT,
  comprobante_url           TEXT,
  estatus                   TEXT NOT NULL DEFAULT 'pendiente'
                              CHECK (estatus IN ('pendiente','parcial','confirmado','cancelado','en_revision')),
  observaciones             TEXT,
  registrado_por            UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  cancelado_por             UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  motivo_cancelacion        TEXT,
  fecha_cancelacion         TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_monto_recibido CHECK (monto_recibido <= monto_total)
);

-- ============================================================
-- TABLA: Salidas financieras
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_expenses (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio                     TEXT NOT NULL UNIQUE,
  fecha_salida              DATE NOT NULL,
  tipo_salida               TEXT NOT NULL,
  beneficiario_nombre       TEXT NOT NULL,
  beneficiario_contacto     TEXT,
  enfermero_id              UUID REFERENCES enfermeros(id) ON DELETE SET NULL,
  paciente_id               UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  caso_id                   UUID REFERENCES casos(id) ON DELETE SET NULL,
  concepto                  TEXT NOT NULL,
  monto                     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto >= 0),
  metodo_pago               TEXT NOT NULL DEFAULT 'efectivo',
  cuenta_origen             TEXT,
  referencia_pago           TEXT,
  comprobante_url           TEXT,
  estatus                   TEXT NOT NULL DEFAULT 'pendiente'
                              CHECK (estatus IN ('pendiente','pagado','por_comprobar','cancelado','en_revision')),
  observaciones             TEXT,
  registrado_por            UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  cancelado_por             UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  motivo_cancelacion        TEXT,
  fecha_cancelacion         TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fin_incomes_paciente  ON financial_incomes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_fin_incomes_caso      ON financial_incomes(caso_id);
CREATE INDEX IF NOT EXISTS idx_fin_incomes_estatus   ON financial_incomes(estatus);
CREATE INDEX IF NOT EXISTS idx_fin_incomes_fecha     ON financial_incomes(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_fin_incomes_created   ON financial_incomes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fin_expenses_paciente ON financial_expenses(paciente_id);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_caso     ON financial_expenses(caso_id);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_estatus  ON financial_expenses(estatus);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_fecha    ON financial_expenses(fecha_salida DESC);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_enf      ON financial_expenses(enfermero_id);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_created  ON financial_expenses(created_at DESC);

-- ============================================================
-- TRIGGERS: updated_at automático
-- Requiere que update_updated_at() ya exista (creada en migración anterior)
-- ============================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['financial_incomes','financial_expenses'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
      CREATE TRIGGER trg_%1$s_updated_at
        BEFORE UPDATE ON %1$s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- RLS — solo admin puede leer y escribir datos financieros
-- ============================================================
ALTER TABLE financial_incomes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['financial_incomes','financial_expenses'] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS policy_%1$s_admin ON %1$s;
      CREATE POLICY policy_%1$s_admin ON %1$s
        FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin());
    ', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- DATOS DE PRUEBA (opcional — comentar en producción)
-- ============================================================
-- Los seeders se ejecutan manualmente desde la app con el botón
-- "Cargar datos de prueba" visible solo en entorno de desarrollo.
