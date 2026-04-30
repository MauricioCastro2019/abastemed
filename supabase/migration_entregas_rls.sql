-- ============================================================
-- FIX: entregas_turno — hacer campos de turno entrante opcionales + RLS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Hacer opcionales los campos de turno entrante
ALTER TABLE entregas_turno
  ALTER COLUMN turno_entrante_id     DROP NOT NULL,
  ALTER COLUMN enfermero_entrante_id DROP NOT NULL;

-- Habilitar RLS
ALTER TABLE entregas_turno ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "entregas_select" ON entregas_turno
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND (
      enfermero_saliente_id = (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
      OR enfermero_entrante_id = (SELECT enfermero_id FROM perfiles WHERE id = auth.uid())
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM turnos t
      JOIN casos c ON c.id = t.caso_id
      JOIN perfiles p ON p.paciente_id = c.paciente_id
      WHERE t.id = entregas_turno.turno_saliente_id AND p.id = auth.uid()
    ))
  );

CREATE POLICY "entregas_insert" ON entregas_turno
  FOR INSERT WITH CHECK (auth_rol() IN ('admin','jefe_enfermeros','enfermero'));

CREATE POLICY "entregas_delete" ON entregas_turno
  FOR DELETE USING (auth_rol() IN ('admin','jefe_enfermeros'));
