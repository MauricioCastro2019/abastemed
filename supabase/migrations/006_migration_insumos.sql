-- ============================================================
-- Módulo de Insumos — catálogo + registro de uso por turno
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TYPE categoria_insumo AS ENUM ('solucion', 'medicamento', 'material', 'otro');

CREATE TABLE insumos_catalogo (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  categoria   categoria_insumo NOT NULL,
  unidad      TEXT NOT NULL,
  costo       NUMERIC(10,2) NOT NULL DEFAULT 0,
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insumos_usados (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id         UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  turno_id        UUID REFERENCES turnos(id) ON DELETE SET NULL,
  enfermero_id    UUID NOT NULL REFERENCES enfermeros(id),
  insumo_id       UUID NOT NULL REFERENCES insumos_catalogo(id),
  cantidad        NUMERIC(10,3) NOT NULL,
  costo_unitario  NUMERIC(10,2) NOT NULL,
  notas           TEXT,
  fecha           TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insumos_usados_caso  ON insumos_usados(caso_id);
CREATE INDEX idx_insumos_usados_turno ON insumos_usados(turno_id);
CREATE INDEX idx_insumos_catalogo_cat ON insumos_catalogo(categoria);

ALTER TABLE insumos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos_usados   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_select" ON insumos_catalogo
  FOR SELECT USING (auth_rol() IN ('admin','jefe_enfermeros','enfermero'));
CREATE POLICY "catalogo_insert" ON insumos_catalogo
  FOR INSERT WITH CHECK (auth_rol() IN ('admin','jefe_enfermeros'));
CREATE POLICY "catalogo_update" ON insumos_catalogo
  FOR UPDATE USING (auth_rol() IN ('admin','jefe_enfermeros'));
CREATE POLICY "catalogo_delete" ON insumos_catalogo
  FOR DELETE USING (auth_rol() IN ('admin','jefe_enfermeros'));

CREATE POLICY "usados_select" ON insumos_usados
  FOR SELECT USING (
    auth_rol() IN ('admin','jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles WHERE id = auth.uid() AND enfermero_id = insumos_usados.enfermero_id
    ))
  );
CREATE POLICY "usados_insert" ON insumos_usados
  FOR INSERT WITH CHECK (
    auth_rol() IN ('admin','jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles WHERE id = auth.uid() AND enfermero_id = insumos_usados.enfermero_id
    ))
  );
CREATE POLICY "usados_delete" ON insumos_usados
  FOR DELETE USING (auth_rol() IN ('admin','jefe_enfermeros'));
