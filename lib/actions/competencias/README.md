# Competencias especializadas

Extiende el sistema de competencias del Centro Profesional (migración `027`) con un ciclo de
vida de vigencia (vigente/caducada/revocada), otorgamiento manual auditable, y requisitos de
competencia por paciente que bloquean la creación de turnos.

No es un sistema nuevo: reusa `competencias`, `enfermero_competencias` y `modulos_capacitacion`
ya existentes, extendidas con columnas nuevas (migración `031`).

## Entidades

- **`competencias`** — catálogo. `activa=false` = DRAFT, no aparece en ningún catálogo ni puede
  requerirse a pacientes. `codigo` identifica competencias especializadas (ej.
  `hemodialisis_vigilancia_domiciliaria`); las competencias del seed original no tienen código.
- **`enfermero_competencias`** — progreso de aprendizaje (`estado`, no tocado) + ciclo de vida de
  vigencia (`estado_vigencia`, `fecha_otorgada`, `fecha_caducidad`, `version_otorgada`). Una
  competencia está "otorgada" cuando `fecha_otorgada` no es null.
- **`competencia_revocaciones`** — histórico de auditoría de revocaciones.
- **`paciente_competencias_requeridas`** — qué competencias necesita cualquier enfermero para
  ser asignado a un paciente.

## Flujo de firma clínica

1. Se crea la competencia y su módulo de capacitación en DRAFT (`activa=false`,
   `modulos_capacitacion.activo=false`).
2. Un responsable clínico revisa el contenido (los módulos nuevos incluyen TODOs marcados
   `PENDIENTE VALIDACIÓN CLÍNICA`).
3. Un admin/coordinador llama `publicarCompetencia(competenciaId, formData)` con
   `firmada_por`, `cedula_responsable`, `fecha_firma`. Esto activa la competencia y su módulo.

## Gate de asignación

`gate-asignacion.ts` expone `evaluarGateCompetencias()` (función pura, sin I/O) y
`verificarCompetenciasParaAsignacion(enfermeroId, pacienteId)` (wrapper con las queries a
Supabase). Se invoca desde `crearTurno()` en `lib/actions/turnos.ts` antes de crear el turno —
es un bloqueo duro, sin posibilidad de override desde la UI (a diferencia del warning de
conflicto de horario).

El gate recalcula la vigencia en tiempo real (compara `fecha_caducidad` contra `now()`) en vez de
confiar en `estado_vigencia`, porque no hay ningún proceso automático manteniendo esa columna al
día — solo se actualiza de forma síncrona cuando se revoca. Ver siguiente sección.

## Caducidad (sin cron real)

`marcarCompetenciasCaducadas()` en `enfermero-competencias.actions.ts` actualiza
`estado_vigencia='caducada'` para las competencias vigentes cuya `fecha_caducidad` ya pasó. El
repo no tiene infraestructura de scheduler. Formas de dispararla cuando se necesite:

- Un botón manual en la UI de administración (no implementado en esta fase).
- Un [Vercel Cron Job](https://vercel.com/docs/cron-jobs) que llame a un route handler
  `app/api/cron/marcar-competencias-caducadas/route.ts` protegido por un secreto en header,
  el cual internamente invoca esta función.
- Una Supabase Scheduled Function / `pg_cron` que llame la misma lógica vía RPC.

Como el gate recalcula la vigencia en tiempo real, el bloqueo de asignación funciona
correctamente incluso si el cron nunca corre — `marcarCompetenciasCaducadas()` solo mantiene la
columna `estado_vigencia` consistente para reportes y para la UI (badges).

## Otorgamiento

Tres puntos de entrada, todos delegando en el helper puro `calcularOtorgamiento()`
(`otorgamiento.ts`) para no duplicar la regla de "cuándo es terminal":

1. **Curso** — `completarModulo()` en `lib/actions/capacitaciones.ts`, al aprobar la evaluación.
2. **Validación práctica** — `validarCompetenciaEnfermero()` en `lib/actions/centro-profesional.ts`.
3. **Manual** — `otorgarCompetenciaManual()` aquí, exige `justificacion` (mínimo 10 caracteres).

Terminal = `'validado'` si la competencia `requiere_validacion_practica`, si no
`'evaluacion_aprobada'`. Al llegar al terminal se estampan `fecha_otorgada`,
`fecha_caducidad` (= `fecha_otorgada + vigencia_meses`, o `null` si la competencia no caduca) y
`version_otorgada` (= `competencias.version` al momento del otorgamiento).

## Versionado

Subir `competencias.version` (v1 → v2) **no** revoca las competencias ya otorgadas en v1 — el
gate no compara versiones, solo vigencia temporal y revocación. `version_otorgada < version`
actual se muestra en la UI como badge informativo "versión previa" para que coordinación decida
su propia política de renovación.

## Revocación

`revocarCompetencia(enfermeroCompetenciaId, formData)` exige `motivo` (mínimo 10 caracteres),
marca `estado_vigencia='revocada'` e inserta un registro en `competencia_revocaciones`. Si el
enfermero vuelve a aprobar el curso después de una revocación, el otorgamiento automático la
vuelve a poner en `'vigente'` — es el comportamiento aceptado en esta primera fase.
