-- ============================================================
-- ABASTEMED — Módulo de Recibos de Pago
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- TABLA: recibos
CREATE TABLE IF NOT EXISTS recibos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio           TEXT NOT NULL UNIQUE,
  paciente_nombre TEXT NOT NULL,
  fecha_emision   DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLA: recibo_items
CREATE TABLE IF NOT EXISTS recibo_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recibo_id       UUID NOT NULL REFERENCES recibos(id) ON DELETE CASCADE,
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(10,2) NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  importe         NUMERIC(10,2) NOT NULL,
  orden           INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recibos_fecha      ON recibos(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_recibos_creado     ON recibos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_recibo_items_recibo ON recibo_items(recibo_id, orden);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE recibos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibo_items ENABLE ROW LEVEL SECURITY;

-- Solo admin y jefe_enfermeros pueden gestionar recibos
CREATE POLICY "recibos_all" ON recibos
  FOR ALL USING (
    (SELECT rol FROM perfiles WHERE id = auth.uid())::text IN ('admin', 'jefe_enfermeros')
  );

CREATE POLICY "recibo_items_all" ON recibo_items
  FOR ALL USING (
    (SELECT rol FROM perfiles WHERE id = auth.uid())::text IN ('admin', 'jefe_enfermeros')
  );

-- ============================================================
-- TRIGGER: actualizar actualizado_en al editar un recibo
-- ============================================================

CREATE OR REPLACE FUNCTION update_recibo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recibo_updated_at
  BEFORE UPDATE ON recibos
  FOR EACH ROW EXECUTE FUNCTION update_recibo_timestamp();
