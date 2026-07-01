-- ============================================================
-- MIGRACIÓN FASE 1 — PARTE 2 de 2
-- Ejecutar DESPUÉS de que la Parte 1 haya terminado exitosamente.
-- ============================================================

-- ============================================================
-- TABLA: organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  razon_social TEXT,
  rfc         TEXT,
  logo_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'activo',
  plan        TEXT NOT NULL DEFAULT 'interno',
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT USING (auth_rol() IN ('admin', 'superadmin', 'coordinador'));

DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE USING (auth_rol() IN ('admin', 'superadmin'));

-- ============================================================
-- ORGANIZACIÓN POR DEFECTO (Abastemed)
-- ============================================================

INSERT INTO organizations (id, nombre, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Abastemed', 'interno')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLA: portfolios (carteras de atención)
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  responsable_id  UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'activo',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolios_select" ON portfolios;
CREATE POLICY "portfolios_select" ON portfolios
  FOR SELECT USING (auth_rol() IN ('admin', 'superadmin', 'coordinador'));

DROP POLICY IF EXISTS "portfolios_insert" ON portfolios;
CREATE POLICY "portfolios_insert" ON portfolios
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "portfolios_update" ON portfolios;
CREATE POLICY "portfolios_update" ON portfolios
  FOR UPDATE USING (auth_rol() IN ('admin', 'superadmin'));

-- ============================================================
-- organization_id EN TABLAS PRINCIPALES
-- Patrón: nullable → poblar → not null
-- ============================================================

-- pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE pacientes
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE pacientes
  ALTER COLUMN organization_id SET NOT NULL;

-- enfermeros
ALTER TABLE enfermeros
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE enfermeros
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE enfermeros
  ALTER COLUMN organization_id SET NOT NULL;

-- casos
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE casos
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE casos
  ALTER COLUMN organization_id SET NOT NULL;

-- prospects
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE prospects
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE prospects
  ALTER COLUMN organization_id SET NOT NULL;

-- levantamientos_paciente
ALTER TABLE levantamientos_paciente
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE levantamientos_paciente
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE levantamientos_paciente
  ALTER COLUMN organization_id SET NOT NULL;

-- financial_incomes
ALTER TABLE financial_incomes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE financial_incomes
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE financial_incomes
  ALTER COLUMN organization_id SET NOT NULL;

-- financial_expenses
ALTER TABLE financial_expenses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE financial_expenses
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE financial_expenses
  ALTER COLUMN organization_id SET NOT NULL;

-- recibos
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE recibos
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE recibos
  ALTER COLUMN organization_id SET NOT NULL;

-- payroll_periods
ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
UPDATE payroll_periods
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
ALTER TABLE payroll_periods
  ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pacientes_org      ON pacientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_enfermeros_org     ON enfermeros(organization_id);
CREATE INDEX IF NOT EXISTS idx_casos_org          ON casos(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospects_org      ON prospects(organization_id);
CREATE INDEX IF NOT EXISTS idx_levantamientos_org ON levantamientos_paciente(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_incomes_org    ON financial_incomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_org   ON financial_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_recibos_org        ON recibos(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_org        ON payroll_periods(organization_id);

-- ============================================================
-- MIGRAR jefe_enfermeros → coordinador
-- ============================================================

UPDATE perfiles
  SET rol = 'coordinador'
  WHERE rol = 'jefe_enfermeros';

-- ============================================================
-- ACTUALIZAR POLÍTICAS RLS
-- ============================================================

-- perfiles
DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles
  FOR SELECT USING (
    id = auth.uid()
    OR auth_rol() IN ('admin', 'coordinador')
  );

DROP POLICY IF EXISTS "perfiles_update" ON perfiles;
CREATE POLICY "perfiles_update" ON perfiles
  FOR UPDATE USING (
    id = auth.uid()
    OR auth_rol() IN ('admin', 'coordinador')
  );

-- pacientes
DROP POLICY IF EXISTS "pacientes_select" ON pacientes;
CREATE POLICY "pacientes_select" ON pacientes
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = pacientes.id
    )
    OR EXISTS (
      SELECT 1 FROM familiar_paciente
      WHERE familiar_id = auth.uid() AND paciente_id = pacientes.id
    )
  );

DROP POLICY IF EXISTS "pacientes_insert" ON pacientes;
CREATE POLICY "pacientes_insert" ON pacientes
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "pacientes_update" ON pacientes;
CREATE POLICY "pacientes_update" ON pacientes
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "pacientes_delete" ON pacientes;
CREATE POLICY "pacientes_delete" ON pacientes
  FOR DELETE USING (auth_rol() = 'admin');

-- enfermeros
DROP POLICY IF EXISTS "enfermeros_insert" ON enfermeros;
CREATE POLICY "enfermeros_insert" ON enfermeros
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "enfermeros_update" ON enfermeros;
CREATE POLICY "enfermeros_update" ON enfermeros
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'coordinador')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = enfermeros.id
    )
  );

DROP POLICY IF EXISTS "enfermeros_delete" ON enfermeros;
CREATE POLICY "enfermeros_delete" ON enfermeros
  FOR DELETE USING (auth_rol() = 'admin');

-- casos
DROP POLICY IF EXISTS "casos_select" ON casos;
CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM turnos t
      JOIN perfiles p ON p.enfermero_id = t.enfermero_id
      WHERE t.caso_id = casos.id AND p.id = auth.uid()
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = casos.paciente_id
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM familiar_paciente fp
      WHERE fp.familiar_id = auth.uid() AND fp.paciente_id = casos.paciente_id
    ))
  );

DROP POLICY IF EXISTS "casos_insert" ON casos;
CREATE POLICY "casos_insert" ON casos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "casos_update" ON casos;
CREATE POLICY "casos_update" ON casos
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "casos_delete" ON casos;
CREATE POLICY "casos_delete" ON casos
  FOR DELETE USING (auth_rol() = 'admin');

-- turnos
DROP POLICY IF EXISTS "turnos_select" ON turnos;
CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM casos c
      JOIN perfiles p ON p.paciente_id = c.paciente_id
      WHERE c.id = turnos.caso_id AND p.id = auth.uid()
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM casos c
      JOIN familiar_paciente fp ON fp.paciente_id = c.paciente_id
      WHERE c.id = turnos.caso_id AND fp.familiar_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "turnos_insert" ON turnos;
CREATE POLICY "turnos_insert" ON turnos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "turnos_update" ON turnos;
CREATE POLICY "turnos_update" ON turnos
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
  );

DROP POLICY IF EXISTS "turnos_delete" ON turnos;
CREATE POLICY "turnos_delete" ON turnos
  FOR DELETE USING (auth_rol() IN ('admin', 'coordinador'));

-- cobranza_items
DROP POLICY IF EXISTS "cobranza_select" ON cobranza_items;
CREATE POLICY "cobranza_select" ON cobranza_items
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "cobranza_insert" ON cobranza_items;
CREATE POLICY "cobranza_insert" ON cobranza_items
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "cobranza_update" ON cobranza_items;
CREATE POLICY "cobranza_update" ON cobranza_items
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- FUNCIÓN HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION user_organization_id()
RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::UUID
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- FIN MIGRACIÓN FASE 1 — PARTE 2
-- ============================================================
