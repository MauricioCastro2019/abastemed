-- ============================================================
-- MIGRACIÓN CORRECTIVA: Completar jefe_enfermeros → coordinador
-- Ejecutar en Supabase SQL Editor (una sola vez, idempotente)
--
-- Qué hace:
--   1. Actualiza funciones auxiliares (is_admin_or_jefe, familiar_puede_ver_turno)
--   2. Restaura casos_select y turnos_select con SECURITY DEFINER
--   3. Arregla enfermeros_select (faltaba coordinador)
--   4. Actualiza TODAS las políticas RLS restantes que aún
--      referencian 'jefe_enfermeros' en las migraciones:
--      insumos, control_pacientes, levantamiento, payroll,
--      portal_familiar, entregas, recibos, plan_cuidado
-- ============================================================

-- ============================================================
-- 1. FUNCIONES AUXILIARES
-- ============================================================

-- is_admin_or_jefe ahora incluye coordinador
-- (usada por prospectos_cotizador y payroll_bitacora_alertas)
CREATE OR REPLACE FUNCTION public.is_admin_or_jefe()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'coordinador')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- familiar_puede_ver_turno: incluye familiar_paciente (portal familiar)
CREATE OR REPLACE FUNCTION familiar_puede_ver_turno(uid uuid, caso_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM casos c
    JOIN perfiles p ON p.paciente_id = c.paciente_id
    WHERE c.id = caso_id_param AND p.id = uid
  )
  OR EXISTS (
    SELECT 1 FROM casos c
    JOIN familiar_paciente fp ON fp.paciente_id = c.paciente_id
    WHERE c.id = caso_id_param AND fp.familiar_id = uid AND fp.activo = TRUE
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 2. RESTAURAR casos_select CON SECURITY DEFINER + coordinador
-- ============================================================

DROP POLICY IF EXISTS "casos_select" ON casos;
CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (
      auth_rol() = 'enfermero'
      AND enfermero_tiene_turno_en_caso(auth.uid(), casos.id)
    )
    OR (
      auth_rol() = 'familiar'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND paciente_id = casos.paciente_id
      )
    )
    OR (
      auth_rol() = 'familiar'
      AND EXISTS (
        SELECT 1 FROM familiar_paciente fp
        WHERE fp.familiar_id = auth.uid()
          AND fp.paciente_id = casos.paciente_id
          AND fp.activo = TRUE
      )
    )
  );

-- ============================================================
-- 3. RESTAURAR turnos_select CON SECURITY DEFINER + coordinador
-- ============================================================

DROP POLICY IF EXISTS "turnos_select" ON turnos;
CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (
      auth_rol() = 'enfermero'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
      )
    )
    OR (
      auth_rol() = 'familiar'
      AND familiar_puede_ver_turno(auth.uid(), turnos.caso_id)
    )
  );

-- ============================================================
-- 4. ENFERMEROS_SELECT (migration_fix_rls_recursion.sql)
-- ============================================================

DROP POLICY IF EXISTS "enfermeros_select" ON enfermeros;
CREATE POLICY "enfermeros_select" ON enfermeros
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = enfermeros.id
    )
  );

-- ============================================================
-- 5. INSUMOS (migration_insumos.sql)
-- ============================================================

DROP POLICY IF EXISTS "catalogo_select" ON insumos_catalogo;
CREATE POLICY "catalogo_select" ON insumos_catalogo
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "catalogo_insert" ON insumos_catalogo;
CREATE POLICY "catalogo_insert" ON insumos_catalogo
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "catalogo_update" ON insumos_catalogo;
CREATE POLICY "catalogo_update" ON insumos_catalogo
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "catalogo_delete" ON insumos_catalogo;
CREATE POLICY "catalogo_delete" ON insumos_catalogo
  FOR DELETE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "usados_select" ON insumos_usados;
CREATE POLICY "usados_select" ON insumos_usados
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (
      auth_rol() = 'enfermero'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND enfermero_id = insumos_usados.enfermero_id
      )
    )
  );

DROP POLICY IF EXISTS "usados_insert" ON insumos_usados;
CREATE POLICY "usados_insert" ON insumos_usados
  FOR INSERT WITH CHECK (
    auth_rol() IN ('admin', 'coordinador')
    OR (
      auth_rol() = 'enfermero'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND enfermero_id = insumos_usados.enfermero_id
      )
    )
  );

DROP POLICY IF EXISTS "usados_delete" ON insumos_usados;
CREATE POLICY "usados_delete" ON insumos_usados
  FOR DELETE USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 6. CONTROL PACIENTES (migration_control_pacientes.sql)
-- ============================================================

-- reportes_turno
DROP POLICY IF EXISTS "reportes_select" ON reportes_turno;
CREATE POLICY "reportes_select" ON reportes_turno
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "reportes_insert" ON reportes_turno;
CREATE POLICY "reportes_insert" ON reportes_turno
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "reportes_update" ON reportes_turno;
CREATE POLICY "reportes_update" ON reportes_turno
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

-- kardex_medicamentos
DROP POLICY IF EXISTS "kardex_select" ON kardex_medicamentos;
CREATE POLICY "kardex_select" ON kardex_medicamentos
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "kardex_insert" ON kardex_medicamentos;
CREATE POLICY "kardex_insert" ON kardex_medicamentos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "kardex_update" ON kardex_medicamentos;
CREATE POLICY "kardex_update" ON kardex_medicamentos
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

-- administraciones_medicamento
DROP POLICY IF EXISTS "admin_med_select" ON administraciones_medicamento;
CREATE POLICY "admin_med_select" ON administraciones_medicamento
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "admin_med_insert" ON administraciones_medicamento;
CREATE POLICY "admin_med_insert" ON administraciones_medicamento
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

-- incidencias
DROP POLICY IF EXISTS "incidencias_select" ON incidencias;
CREATE POLICY "incidencias_select" ON incidencias
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "incidencias_insert" ON incidencias;
CREATE POLICY "incidencias_insert" ON incidencias
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "incidencias_update" ON incidencias;
CREATE POLICY "incidencias_update" ON incidencias
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 7. LEVANTAMIENTOS (migration_levantamiento.sql)
-- ============================================================

DROP POLICY IF EXISTS "levantamientos_select" ON levantamientos_paciente;
CREATE POLICY "levantamientos_select" ON levantamientos_paciente
  FOR SELECT USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "levantamientos_insert" ON levantamientos_paciente;
CREATE POLICY "levantamientos_insert" ON levantamientos_paciente
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "levantamientos_update" ON levantamientos_paciente;
CREATE POLICY "levantamientos_update" ON levantamientos_paciente
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "lev_meds_all" ON levantamiento_medicamentos;
CREATE POLICY "lev_meds_all" ON levantamiento_medicamentos
  FOR ALL USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "lev_mats_all" ON levantamiento_materiales;
CREATE POLICY "lev_mats_all" ON levantamiento_materiales
  FOR ALL USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 8. PAYROLL / BITÁCORA / ALERTAS (migration_payroll_bitacora_alertas.sql)
-- ============================================================

-- bitacora_entries
DROP POLICY IF EXISTS "bitacora_jefe_select" ON bitacora_entries;
CREATE POLICY "bitacora_jefe_select"
  ON public.bitacora_entries
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_rol() IN ('jefe_enfermeros', 'coordinador')
    AND entidad IN ('turnos', 'incidencias', 'reportes_turno', 'kardex_medicamentos', 'enfermeros')
  );

-- alertas
DROP POLICY IF EXISTS "alertas_jefe_select_update" ON alertas;
CREATE POLICY "alertas_jefe_select_update"
  ON public.alertas
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_rol() IN ('jefe_enfermeros', 'coordinador')
    AND tipo IN (
      'turno_sin_enfermero', 'turno_sin_iniciar', 'turno_sin_reporte',
      'turno_sin_entrega', 'enfermero_no_confirmo', 'reporte_pendiente',
      'incidencia_critica', 'incidencia_grave', 'medicamento_sin_existencia',
      'turno_en_aclaracion'
    )
  );

DROP POLICY IF EXISTS "alertas_jefe_insert" ON alertas;
CREATE POLICY "alertas_jefe_insert"
  ON public.alertas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_rol() IN ('admin', 'jefe_enfermeros', 'coordinador'));

-- payroll_periods
DROP POLICY IF EXISTS "payroll_periods_jefe_select" ON payroll_periods;
CREATE POLICY "payroll_periods_jefe_select"
  ON public.payroll_periods
  FOR SELECT
  TO authenticated
  USING (public.get_user_rol() IN ('jefe_enfermeros', 'coordinador'));

-- payroll_items
DROP POLICY IF EXISTS "payroll_items_jefe_select" ON payroll_items;
CREATE POLICY "payroll_items_jefe_select"
  ON public.payroll_items
  FOR SELECT
  TO authenticated
  USING (public.get_user_rol() IN ('jefe_enfermeros', 'coordinador'));

-- ============================================================
-- 9. PORTAL FAMILIAR (migration_portal_familiar.sql)
-- ============================================================

-- familiar_paciente
DROP POLICY IF EXISTS "fp_select" ON familiar_paciente;
CREATE POLICY "fp_select"
  ON familiar_paciente FOR SELECT
  USING (
    auth.uid() = familiar_id
    OR auth_rol() IN ('admin', 'coordinador')
  );

DROP POLICY IF EXISTS "fp_insert" ON familiar_paciente;
CREATE POLICY "fp_insert"
  ON familiar_paciente FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "fp_update" ON familiar_paciente;
CREATE POLICY "fp_update"
  ON familiar_paciente FOR UPDATE
  USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "fp_delete" ON familiar_paciente;
CREATE POLICY "fp_delete"
  ON familiar_paciente FOR DELETE
  USING (auth_rol() IN ('admin', 'coordinador'));

-- reportes_turno: política familiar (reemplaza la de portal_familiar)
DROP POLICY IF EXISTS "reportes_turno_familiar_select" ON reportes_turno;
CREATE POLICY "reportes_turno_familiar_select"
  ON reportes_turno FOR SELECT
  USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
    OR (
      auth_rol() = 'familiar'
      AND visible_para_familia = TRUE
      AND familiar_tiene_acceso_paciente(
        auth.uid(),
        (SELECT c.paciente_id FROM casos c WHERE c.id = caso_id LIMIT 1)
      )
    )
  );

-- incidencias: política familiar (reemplaza la de portal_familiar)
DROP POLICY IF EXISTS "incidencias_familiar_select" ON incidencias;
CREATE POLICY "incidencias_familiar_select"
  ON incidencias FOR SELECT
  USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
    OR (
      auth_rol() = 'familiar'
      AND visible_para_familia = TRUE
      AND familiar_tiene_acceso_paciente(
        auth.uid(),
        (SELECT c.paciente_id FROM casos c WHERE c.id = caso_id LIMIT 1)
      )
    )
  );

-- citas_medicas
DROP POLICY IF EXISTS "citas_admin_all" ON citas_medicas;
CREATE POLICY "citas_admin_all"
  ON citas_medicas FOR ALL
  USING (auth_rol() IN ('admin', 'coordinador'));

-- solicitudes_familia
DROP POLICY IF EXISTS "sf_familiar_ops" ON solicitudes_familia;
CREATE POLICY "sf_familiar_ops"
  ON solicitudes_familia FOR SELECT
  USING (
    auth.uid() = familiar_id
    OR auth_rol() IN ('admin', 'coordinador')
  );

DROP POLICY IF EXISTS "sf_admin_update" ON solicitudes_familia;
CREATE POLICY "sf_admin_update"
  ON solicitudes_familia FOR UPDATE
  USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 10. ENTREGAS TURNO (migration_entregas_rls.sql)
-- ============================================================

DROP POLICY IF EXISTS "entregas_select" ON entregas_turno;
CREATE POLICY "entregas_select" ON entregas_turno
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador')
    OR (
      auth_rol() = 'enfermero'
      AND (
        enfermero_saliente_id = (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
        OR enfermero_entrante_id = (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
      )
    )
    OR (
      auth_rol() = 'familiar'
      AND EXISTS (
        SELECT 1 FROM turnos t
        JOIN casos c ON c.id = t.caso_id
        JOIN perfiles p ON p.paciente_id = c.paciente_id
        WHERE t.id = entregas_turno.turno_saliente_id AND p.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "entregas_insert" ON entregas_turno;
CREATE POLICY "entregas_insert" ON entregas_turno
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));

DROP POLICY IF EXISTS "entregas_delete" ON entregas_turno;
CREATE POLICY "entregas_delete" ON entregas_turno
  FOR DELETE USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 11. RECIBOS (recibos_schema.sql)
-- Nota: cambiamos el inline subquery por auth_rol() SECURITY DEFINER
-- ============================================================

DROP POLICY IF EXISTS "recibos_all" ON recibos;
CREATE POLICY "recibos_all" ON recibos
  FOR ALL USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "recibo_items_all" ON recibo_items;
CREATE POLICY "recibo_items_all" ON recibo_items
  FOR ALL USING (auth_rol() IN ('admin', 'coordinador'));

-- ============================================================
-- 12. PLAN DE CUIDADO (migration_plan_cuidado.sql)
-- ============================================================

DROP POLICY IF EXISTS "indicaciones_select" ON indicaciones;
CREATE POLICY "indicaciones_select" ON indicaciones
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = indicaciones.paciente_id
    )
  );

DROP POLICY IF EXISTS "indicaciones_insert" ON indicaciones;
CREATE POLICY "indicaciones_insert" ON indicaciones
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "indicaciones_update" ON indicaciones;
CREATE POLICY "indicaciones_update" ON indicaciones
  FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "eventos_select" ON eventos_indicacion;
CREATE POLICY "eventos_select" ON eventos_indicacion
  FOR SELECT USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = eventos_indicacion.paciente_id
    )
  );

DROP POLICY IF EXISTS "eventos_insert" ON eventos_indicacion;
CREATE POLICY "eventos_insert" ON eventos_indicacion
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));

DROP POLICY IF EXISTS "eventos_update" ON eventos_indicacion;
CREATE POLICY "eventos_update" ON eventos_indicacion
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'coordinador', 'enfermero')
  );

-- ============================================================
-- VERIFICACIÓN (ejecutar manualmente después):
-- SELECT count(*) FROM casos;
-- SELECT count(*) FROM turnos;
-- SELECT count(*) FROM enfermeros;
-- SELECT count(*) FROM insumos_catalogo;
-- ============================================================
