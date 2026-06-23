-- ============================================================
-- MIGRACIÓN: Habilitar Supabase Realtime en tablas críticas
-- Ejecutar en Supabase SQL Editor UNA SOLA VEZ
-- ============================================================

-- Habilitar replicación lógica para las tablas que necesitan
-- actualizaciones en tiempo real en el dashboard y listas

ALTER PUBLICATION supabase_realtime ADD TABLE casos;
ALTER PUBLICATION supabase_realtime ADD TABLE turnos;
ALTER PUBLICATION supabase_realtime ADD TABLE alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE pacientes;
ALTER PUBLICATION supabase_realtime ADD TABLE levantamientos_paciente;
ALTER PUBLICATION supabase_realtime ADD TABLE cobranza_items;

-- ============================================================
-- FIN MIGRACIÓN: Realtime
-- ============================================================
