-- ============================================================
-- ABASTEMED — Schema completo Supabase
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE contexto_paciente AS ENUM ('domicilio', 'hospital', 'casa_reposo');
CREATE TYPE status_paciente    AS ENUM ('activo', 'cerrado');
CREATE TYPE status_caso        AS ENUM ('activo', 'pausado', 'cerrado');
CREATE TYPE status_turno       AS ENUM ('programado', 'activo', 'completado');
CREATE TYPE status_cobranza    AS ENUM ('pendiente', 'pagado');
CREATE TYPE rol_usuario        AS ENUM ('admin', 'enfermero', 'familiar');

-- ============================================================
-- TABLA: perfiles (extiende auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol         rol_usuario NOT NULL DEFAULT 'familiar',
  nombre      TEXT NOT NULL,
  apellido    TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefono    TEXT,
  foto_url    TEXT,
  enfermero_id UUID,
  paciente_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pacientes
-- ============================================================

CREATE TABLE IF NOT EXISTS pacientes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre             TEXT NOT NULL,
  apellido           TEXT NOT NULL,
  fecha_nacimiento   DATE NOT NULL,
  diagnostico        TEXT NOT NULL,
  medicamentos       TEXT[] NOT NULL DEFAULT '{}',
  alergias           TEXT[] NOT NULL DEFAULT '{}',
  contacto_familiar  JSONB NOT NULL DEFAULT '{}',
  contexto           contexto_paciente NOT NULL DEFAULT 'domicilio',
  status             status_paciente NOT NULL DEFAULT 'activo',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: enfermeros
-- ============================================================

CREATE TABLE IF NOT EXISTS enfermeros (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL,
  cedula        TEXT NOT NULL UNIQUE,
  especialidades TEXT[] NOT NULL DEFAULT '{}',
  telefono      TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  foto_url      TEXT,
  bio           TEXT,
  disponible    BOOLEAN NOT NULL DEFAULT TRUE,
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_casos   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: casos
-- ============================================================

CREATE TABLE IF NOT EXISTS casos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id  UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  titulo       TEXT NOT NULL,
  contexto     contexto_paciente NOT NULL DEFAULT 'domicilio',
  direccion    TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE,
  status       status_caso NOT NULL DEFAULT 'activo',
  tarifa_hora  NUMERIC(10,2) NOT NULL,
  notas        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: turnos
-- ============================================================

CREATE TABLE IF NOT EXISTS turnos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id          UUID NOT NULL REFERENCES casos(id) ON DELETE RESTRICT,
  enfermero_id     UUID NOT NULL REFERENCES enfermeros(id) ON DELETE RESTRICT,
  fecha_inicio     TIMESTAMPTZ NOT NULL,
  fecha_fin        TIMESTAMPTZ NOT NULL,
  horas_trabajadas NUMERIC(5,2) NOT NULL DEFAULT 0,
  status           status_turno NOT NULL DEFAULT 'programado',
  notas_entrega    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: fecha_fin debe ser después de fecha_inicio
  CONSTRAINT turnos_fechas_validas CHECK (fecha_fin > fecha_inicio)
);

-- ============================================================
-- TABLA: entregas_turno
-- ============================================================

CREATE TABLE IF NOT EXISTS entregas_turno (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_saliente_id           UUID NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
  turno_entrante_id           UUID NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
  enfermero_saliente_id       UUID NOT NULL REFERENCES enfermeros(id) ON DELETE RESTRICT,
  enfermero_entrante_id       UUID NOT NULL REFERENCES enfermeros(id) ON DELETE RESTRICT,
  signos_vitales              JSONB NOT NULL DEFAULT '{}',
  medicamentos_administrados  JSONB NOT NULL DEFAULT '[]',
  observaciones               TEXT NOT NULL,
  incidentes                  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: cobranza_items
-- ============================================================

CREATE TABLE IF NOT EXISTS cobranza_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id    UUID NOT NULL REFERENCES casos(id) ON DELETE RESTRICT,
  turno_id   UUID NOT NULL REFERENCES turnos(id) ON DELETE RESTRICT,
  concepto   TEXT NOT NULL,
  horas      NUMERIC(5,2) NOT NULL,
  tarifa     NUMERIC(10,2) NOT NULL,
  subtotal   NUMERIC(10,2) NOT NULL GENERATED ALWAYS AS (horas * tarifa) STORED,
  status     status_cobranza NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_perfiles_rol         ON perfiles(rol);
CREATE INDEX idx_casos_paciente       ON casos(paciente_id);
CREATE INDEX idx_casos_status         ON casos(status);
CREATE INDEX idx_turnos_caso          ON turnos(caso_id);
CREATE INDEX idx_turnos_enfermero     ON turnos(enfermero_id);
CREATE INDEX idx_turnos_fecha_inicio  ON turnos(fecha_inicio);
CREATE INDEX idx_turnos_status        ON turnos(status);
CREATE INDEX idx_cobranza_caso        ON cobranza_items(caso_id);
CREATE INDEX idx_cobranza_status      ON cobranza_items(status);

-- ============================================================
-- FOREIGN KEY: perfiles → enfermeros / pacientes
-- (después de crear las tablas)
-- ============================================================

ALTER TABLE perfiles
  ADD CONSTRAINT perfiles_enfermero_fk
    FOREIGN KEY (enfermero_id) REFERENCES enfermeros(id) ON DELETE SET NULL;

ALTER TABLE perfiles
  ADD CONSTRAINT perfiles_paciente_fk
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enfermeros       ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_turno   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobranza_items   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Helper: obtener rol del usuario actual
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_rol()
RETURNS rol_usuario AS $$
  SELECT rol FROM perfiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------
-- POLÍTICAS: perfiles
-- ----------------------------------------------------------------

-- Cada usuario ve solo su propio perfil (o admins ven todos)
CREATE POLICY "perfiles_select" ON perfiles
  FOR SELECT USING (
    id = auth.uid() OR auth_rol() = 'admin'
  );

CREATE POLICY "perfiles_update" ON perfiles
  FOR UPDATE USING (
    id = auth.uid() OR auth_rol() = 'admin'
  );

-- ----------------------------------------------------------------
-- POLÍTICAS: pacientes
-- ----------------------------------------------------------------

CREATE POLICY "pacientes_select" ON pacientes
  FOR SELECT USING (
    auth_rol() IN ('admin', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = pacientes.id
    )
  );

CREATE POLICY "pacientes_insert" ON pacientes
  FOR INSERT WITH CHECK (auth_rol() = 'admin');

CREATE POLICY "pacientes_update" ON pacientes
  FOR UPDATE USING (auth_rol() = 'admin');

CREATE POLICY "pacientes_delete" ON pacientes
  FOR DELETE USING (auth_rol() = 'admin');

-- ----------------------------------------------------------------
-- POLÍTICAS: enfermeros
-- ----------------------------------------------------------------

CREATE POLICY "enfermeros_select" ON enfermeros
  FOR SELECT USING (
    auth_rol() IN ('admin', 'enfermero')
  );

CREATE POLICY "enfermeros_insert" ON enfermeros
  FOR INSERT WITH CHECK (auth_rol() = 'admin');

CREATE POLICY "enfermeros_update" ON enfermeros
  FOR UPDATE USING (
    auth_rol() = 'admin'
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = enfermeros.id
    )
  );

CREATE POLICY "enfermeros_delete" ON enfermeros
  FOR DELETE USING (auth_rol() = 'admin');

-- ----------------------------------------------------------------
-- POLÍTICAS: casos
-- ----------------------------------------------------------------

CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM turnos t
      JOIN perfiles p ON p.enfermero_id = t.enfermero_id
      WHERE t.caso_id = casos.id AND p.id = auth.uid()
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = casos.paciente_id
    ))
  );

CREATE POLICY "casos_insert"  ON casos FOR INSERT WITH CHECK (auth_rol() = 'admin');
CREATE POLICY "casos_update"  ON casos FOR UPDATE USING (auth_rol() = 'admin');
CREATE POLICY "casos_delete"  ON casos FOR DELETE USING (auth_rol() = 'admin');

-- ----------------------------------------------------------------
-- POLÍTICAS: turnos
-- ----------------------------------------------------------------

CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM casos c
      JOIN perfiles p ON p.paciente_id = c.paciente_id
      WHERE c.id = turnos.caso_id AND p.id = auth.uid()
    ))
  );

CREATE POLICY "turnos_insert"  ON turnos FOR INSERT WITH CHECK (auth_rol() = 'admin');
CREATE POLICY "turnos_update"  ON turnos FOR UPDATE USING (
  auth_rol() = 'admin'
  OR (auth_rol() = 'enfermero' AND EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
  ))
);
CREATE POLICY "turnos_delete"  ON turnos FOR DELETE USING (auth_rol() = 'admin');

-- ----------------------------------------------------------------
-- POLÍTICAS: entregas_turno
-- ----------------------------------------------------------------

CREATE POLICY "entregas_select" ON entregas_turno
  FOR SELECT USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'enfermero' AND (
      enfermero_saliente_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
      OR enfermero_entrante_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
    ))
  );

CREATE POLICY "entregas_insert" ON entregas_turno
  FOR INSERT WITH CHECK (
    auth_rol() IN ('admin', 'enfermero')
  );

-- ----------------------------------------------------------------
-- POLÍTICAS: cobranza_items
-- ----------------------------------------------------------------

CREATE POLICY "cobranza_select" ON cobranza_items
  FOR SELECT USING (auth_rol() = 'admin');

CREATE POLICY "cobranza_insert" ON cobranza_items
  FOR INSERT WITH CHECK (auth_rol() = 'admin');

CREATE POLICY "cobranza_update" ON cobranza_items
  FOR UPDATE USING (auth_rol() = 'admin');

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrar usuario
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, rol, nombre, apellido, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'familiar')::rol_usuario,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN: calcular horas trabajadas automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_horas_turno()
RETURNS TRIGGER AS $$
BEGIN
  NEW.horas_trabajadas := EXTRACT(EPOCH FROM (NEW.fecha_fin - NEW.fecha_inicio)) / 3600;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER turno_calcular_horas
  BEFORE INSERT OR UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION calcular_horas_turno();
