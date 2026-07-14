-- ============================================================
-- H3 FIX: Nurse self-update sin service role
-- ============================================================
-- Contexto:
--   `lib/actions/enfermero-portal.ts::actualizarMiPerfil` usa
--   createServiceClient() para hacer UPDATE en `enfermeros`.
--   Eso bypasea RLS por completo. Este archivo cierra el vector
--   en tres capas:
--     1. WITH CHECK en la policy de UPDATE
--     2. TRIGGER que bloquea cambios en columnas privilegiadas
--        cuando quien actualiza NO es admin/coordinador
--     3. (app layer) — refactor de actualizarMiPerfil para usar
--        createClient() en lugar de createServiceClient()
--
-- Dependencias previas:
--   001_schema.sql                     (tabla enfermeros, función auth_rol)
--   021_migration_fase1_parte2_main.sql (última versión vigente de
--                                        enfermeros_update — usa 'coordinador',
--                                        no 'jefe_enfermeros'; 022 confirma que
--                                        jefe_enfermeros quedó reemplazado en
--                                        todas las policies restantes)
--
-- Idempotencia: todo el archivo es re-ejecutable sin efectos secundarios.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Endurecer policy: agregar WITH CHECK
-- ------------------------------------------------------------
-- La policy vigente (021) solo tiene USING. Sin WITH CHECK, en
-- teoría Postgres reutiliza USING como CHECK, pero es mejor ser
-- explícito para que el intento de reasignar enfermero_id sea
-- imposible.

DROP POLICY IF EXISTS "enfermeros_update" ON enfermeros;

CREATE POLICY "enfermeros_update" ON enfermeros
  FOR UPDATE
  USING (
    auth_rol() IN ('admin', 'coordinador')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
        AND enfermero_id = enfermeros.id
    )
  )
  WITH CHECK (
    auth_rol() IN ('admin', 'coordinador')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
        AND enfermero_id = enfermeros.id
    )
  );

-- ------------------------------------------------------------
-- 2. Trigger: bloquear cambios en columnas privilegiadas
--    cuando quien actualiza NO es admin/coordinador
-- ------------------------------------------------------------
-- Columnas protegidas contra auto-edición del enfermero:
--   - Identidad legal:   cedula, email, nombre, apellido
--   - Métricas del sistema: rating, total_casos
--   - Inmutables:        id, created_at
-- Columnas que el enfermero SÍ puede autoeditar:
--   telefono, bio, especialidades, disponible, foto_url

CREATE OR REPLACE FUNCTION enfermeros_bloquear_columnas_privilegiadas()
RETURNS TRIGGER AS $$
DECLARE
  rol_actor rol_usuario;
BEGIN
  -- Admin y coordinador tienen paso libre
  rol_actor := auth_rol();
  IF rol_actor IN ('admin', 'coordinador') THEN
    RETURN NEW;
  END IF;

  -- Cualquier otro rol: rechazar cambios en columnas protegidas
  IF NEW.cedula      IS DISTINCT FROM OLD.cedula      THEN RAISE EXCEPTION 'No puedes modificar tu cedula. Contacta a coordinación.'; END IF;
  IF NEW.email       IS DISTINCT FROM OLD.email       THEN RAISE EXCEPTION 'No puedes modificar tu email. Contacta a coordinación.'; END IF;
  IF NEW.nombre      IS DISTINCT FROM OLD.nombre      THEN RAISE EXCEPTION 'No puedes modificar tu nombre. Contacta a coordinación.'; END IF;
  IF NEW.apellido    IS DISTINCT FROM OLD.apellido    THEN RAISE EXCEPTION 'No puedes modificar tu apellido. Contacta a coordinación.'; END IF;
  IF NEW.rating      IS DISTINCT FROM OLD.rating      THEN RAISE EXCEPTION 'rating es calculado por el sistema.'; END IF;
  IF NEW.total_casos IS DISTINCT FROM OLD.total_casos THEN RAISE EXCEPTION 'total_casos es calculado por el sistema.'; END IF;
  IF NEW.created_at  IS DISTINCT FROM OLD.created_at  THEN RAISE EXCEPTION 'created_at es inmutable.'; END IF;
  IF NEW.id          IS DISTINCT FROM OLD.id          THEN RAISE EXCEPTION 'id es inmutable.'; END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enfermeros_bloquear_columnas_privilegiadas ON enfermeros;

CREATE TRIGGER trg_enfermeros_bloquear_columnas_privilegiadas
  BEFORE UPDATE ON enfermeros
  FOR EACH ROW
  EXECUTE FUNCTION enfermeros_bloquear_columnas_privilegiadas();

-- ------------------------------------------------------------
-- 3. Comentarios de documentación
-- ------------------------------------------------------------
COMMENT ON POLICY "enfermeros_update" ON enfermeros IS
  'H3: admin/coordinador libres. Enfermero puede editar su propio row. WITH CHECK garantiza que no puede reasignar el row a otro enfermero_id.';

COMMENT ON FUNCTION enfermeros_bloquear_columnas_privilegiadas() IS
  'H3: rechaza cambios en columnas de identidad y métricas del sistema cuando el actor NO es admin/coordinador. Defensa en profundidad frente a bypass accidental de RLS.';

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-EJECUCIÓN (correr manualmente en SQL Editor):
-- ============================================================
-- 1) Como enfermero autenticado (sesión real, NO service role):
--    UPDATE enfermeros SET telefono = '4771234567' WHERE id = <mi_id>;
--    -- Debe funcionar.
--
-- 2) Como el mismo enfermero:
--    UPDATE enfermeros SET rating = 5.0 WHERE id = <mi_id>;
--    -- Debe fallar con: "rating es calculado por el sistema."
--
-- 3) Como el mismo enfermero:
--    UPDATE enfermeros SET telefono = '4771234567'
--    WHERE id = <otro_enfermero_id>;
--    -- Debe fallar por RLS (0 rows affected) — no ve el row.
--
-- 4) Como admin:
--    UPDATE enfermeros SET rating = 4.5 WHERE id = <cualquier_id>;
--    -- Debe funcionar (admin pasa el trigger sin problema).
-- ============================================================
