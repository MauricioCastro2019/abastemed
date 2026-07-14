# Orden canónico de migraciones — Abastemed

La base de datos de producción **ya tiene todas estas migraciones aplicadas**. Este
orden no es para "correr" contra producción — es para reconstrucción: un entorno de
staging, disaster recovery, o el onboarding de un colaborador que necesita levantar
una copia limpia de la base de datos.

Las migraciones se aplican manualmente en el SQL Editor de Supabase, en el orden
numérico de esta tabla.

## Regla permanente

**Toda migración nueva se crea con el siguiente número secuencial disponible. Sin excepción. Sin migraciones con nombre sin número.**

## Tabla canónica

| # | Archivo | Fecha (git) | Nota |
|---|---|---|---|
| 001 | `001_schema.sql` | 2026-04-11 | Schema base |
| 002 | `002_recibos_schema.sql` | 2026-04-25 | |
| 003 | `003_migration_jefe_enfermeros.sql` | 2026-04-25 | |
| 004 | `004_migration_performance.sql` | 2026-04-27 | |
| 005 | `005_migration_fix_rls_recursion.sql` | 2026-04-28 | |
| 006 | `006_migration_insumos.sql` | 2026-04-29 | |
| 007 | `007_migration_entregas_rls.sql` | 2026-04-29 | |
| 008 | `008_migration_add_servicio_insumo.sql` | 2026-05-03 | |
| 009 | `009_migration_plan_cuidado.sql` | 2026-05-14 | |
| 010 | `010_migration_precio_insumos.sql` | 2026-05-14 | |
| 011 | `011_migration_levantamiento.sql` | 2026-05-28 | |
| 012 | `012_migration_control_pacientes.sql` | 2026-06-02 | requiere 011 |
| 013 | `013_migration_prospectos_cotizador.sql` | 2026-06-02 | |
| 014 | `014_migration_finanzas.sql` | 2026-06-02 | requiere 012 |
| 015 | `015_migration_recibos_metodo_pago.sql` | 2026-06-15 | |
| 016 | `016_migration_payroll_bitacora_alertas.sql` | 2026-06-16 | |
| 017 | `017_migration_flujo_levantamiento.sql` | 2026-06-16 | |
| 018 | `018_migration_casos_horario.sql` | 2026-06-19 | |
| 019 | `019_migration_portal_familiar.sql` | 2026-06-20 | |
| 020 | `020_migration_fase1_parte1_enum.sql` | 2026-06-22 | Parte 1 de 2 — ejecutar antes de 021 |
| 021 | `021_migration_fase1_parte2_main.sql` | 2026-06-22 | Parte 2 de 2 — requiere 020 |
| 022 | `022_migration_fase1_fix_rls.sql` | 2026-06-22 | requiere 021 y 003 |
| 023 | `023_migration_coordinador_scoping.sql` | 2026-06-22 | requiere 022 |
| 024 | `024_migration_realtime.sql` | 2026-06-23 | |
| 025 | `025_migration_memoria_operativa.sql` | 2026-06-24 | requiere 012 |
| 026 | `026_migration_prospectos_scoping.sql` | 2026-06-25 | requiere 023 |
| 027 | `027_migration_centro_profesional.sql` | 2026-06-30 | |
| 028 | `028_migration_equipo_cuidado.sql` | 2026-06-30 | |
| 029 | `029_migration_capacitacion_cateterismo_intermitente.sql` | 2026-07-01 | |
| 030 | `030_migration_nai_fase1.sql` | 2026-07-01 | |
| 031 | `031_migration_competencias_especializadas.sql` | 2026-07-08 | requiere 027 |
| 032 | `032_migration_capacitacion_ruta_renal.sql` | 2026-07-08 | requiere 031 |
| 033 | `033_migration_fix_nurse_self_update_rls.sql` | 2026-07-08 | H3 — WITH CHECK + trigger en enfermeros_update |
| 034 | `034_migration_capacitacion_hipotension_arterial.sql` | 2026-07-13 | Capacitación hipotensión arterial + columna leccion_actual. La más reciente |

## Deprecadas / no aplicar

Archivos conservados solo por historia en `supabase/_deprecated/`. No forman parte
de la cadena de reconstrucción — no ejecutar.

| Archivo | Motivo |
|---|---|
| `fase1_organizacion__superseded_by_parte1_parte2.sql` | Versión monolítica pre-split de la Fase 1 organizacional. Mete el `ALTER TYPE ... ADD VALUE` en la misma transacción que su uso en políticas RLS, lo cual falla en PostgreSQL. Reemplazada por `020_migration_fase1_parte1_enum.sql` + `021_migration_fase1_parte2_main.sql`. Origen incierto (no se confirmó si llegó a ejecutarse en producción). |
