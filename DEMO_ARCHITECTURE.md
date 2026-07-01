# Demo Architecture — Abastemed

## Resumen

El entorno de demostración de Abastemed usa el mismo sistema de producción pero con datos completamente ficticios, aislados mediante una **organización demo separada** y **usuarios de autenticación dedicados**.

No existe una base de datos diferente ni un servidor paralelo. La separación es por tenant (organization_id) y por políticas RLS que garantizan que los datos demo no cruzan con los datos reales.

---

## Estructura de aislamiento

| Elemento | Producción | Demo |
|----------|-----------|------|
| Base de datos | Supabase compartida | Supabase compartida |
| Organización | `00000000-0000-0000-0000-000000000001` | `dddddddd-0000-0000-0000-000000000002` |
| Usuarios auth | Emails de clientes reales | `*@demo.abastemed.com` |
| Datos | Pacientes reales | Elena Ramírez Torres (ficticia) |
| Separación | RLS por coordinador_id/paciente_id | RLS por coordinador_id/paciente_id |

**El RLS existente garantiza el aislamiento:** un coordinador demo solo ve sus casos demo, una familiar demo solo ve a Elena. No se requiere lógica adicional.

---

## Credenciales

| Perfil | Email | Contraseña | Dashboard |
|--------|-------|-----------|-----------|
| Coordinadora (Daniela Torres) | coordinadora@demo.abastemed.com | Demo2024! | /dashboard |
| Enfermera diurna (Andrea López) | andrea@demo.abastemed.com | Demo2024! | /enfermero/dashboard |
| Enfermero nocturno (Salvador Pérez) | salvador@demo.abastemed.com | Demo2024! | /enfermero/dashboard |
| Enfermera cobertura (Fernanda Ruiz) | fernanda@demo.abastemed.com | Demo2024! | /enfermero/dashboard |
| Familiar (Laura Ramírez) | laura@demo.abastemed.com | Demo2024! | /familiar/dashboard |

---

## Acceso a la demo

La demo es accesible sin login en:

```
/demo
```

Muestra 4 botones de rol que hacen `signInWithPassword` con las credenciales demo y redirigen al portal correspondiente.

---

## Caso de demostración

**Paciente:** Elena Ramírez Torres, 78 años, hipertensión + movilidad reducida post-fractura de cadera.

**Semana documentada:** 6 días anteriores + día actual.

| Día | Diurno | Nocturno | Evento |
|-----|--------|---------|--------|
| D-6 | Andrea (✓ validado) | Salvador (✓ validado) | Inicio de servicio |
| D-5 | Andrea (✓ validado) | Salvador (✓ validado) | **Hallazgo de piel** detectado |
| D-4 | Andrea (✓ validado) | Salvador (✓ validado) | Pendiente de medicamento registrado |
| D-3 | Andrea (✓ validado) | Salvador (✓ validado) | **Incidencia hipertensiva** — resuelta |
| D-2 | **Fernanda** (en revisión) | Salvador (✓ validado) | **Cobertura** — Andrea indisponible |
| D-1 | Andrea (pendiente) | Salvador (pendiente) | Medicamento surtido, sin novedades |
| Hoy | Andrea (programado) | Salvador (programado) | Turno activo |

**Incidencia:** Presión 160/90 mmHg a las 16:00 del D-3. Doble medición. Indicación PRN seguida. Presión normalizada a 140/70 a las 18:00. Familiar y coordinación notificadas.

**Hallazgo:** Enrojecimiento sacra leve (Categoría I). Detectado D-5. Resuelto D-3 con cambios posturales y crema barrera.

**Cobertura:** D-2 Andrea reportó indisponibilidad. Fernanda cubrió el turno diurno. Coordinadora asignó el cambio y notificó a la familia.

---

## Setup inicial (primera vez)

### Paso 1: Ejecutar el seed en Supabase SQL Editor

```sql
-- Copiar y pegar el contenido completo de:
supabase/seeds/seed_demo.sql
```

El seed es **idempotente**: limpia registros demo existentes antes de recrearlos.

Ejecutar en: **Supabase Dashboard → SQL Editor → New Query**

El SQL Editor tiene acceso `postgres` (superadmin) y puede insertar en `auth.users`.

### Paso 2: Verificar

Tras ejecutar, debes ver en los NOTICES:
```
Turnos creados: 14
Reportes de turno: 12
Incidencias: 1
Hallazgos: 1
...
```

### Paso 3: Probar acceso

Ir a `/demo` en tu app. Seleccionar "Coordinadora operativa". Debe redirigir al `/dashboard` con datos de Elena.

---

## Reset de la demo

Para restaurar el estado inicial (borrar cambios hechos durante una sesión de demo):

1. Abrir Supabase SQL Editor
2. Ejecutar `supabase/seeds/seed_demo.sql` nuevamente

El script limpia todos los registros demo y los recrea desde cero. Los datos de producción **nunca son tocados** (el script solo borra por `organization_id = dddddddd-...` o por UUIDs fijos de demo).

### Si el seed falla con "duplicate key"

El PASO 0 del seed usa bloques independientes por tabla, pero si algo sale mal, ejecuta primero el script de limpieza manual:

```
supabase/scripts/reset_demo.sql   ← ejecutar primero
supabase/seeds/seed_demo.sql      ← ejecutar después
```

`reset_demo.sql` tiene cada DELETE en su propio `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; END $$` para que un fallo en una tabla no bloquee las demás.

---

## Componentes del sistema demo

| Archivo | Propósito |
|---------|-----------|
| `supabase/seeds/seed_demo.sql` | Crea auth.users + todos los datos del caso Elena |
| `app/(auth)/demo/page.tsx` | Página pública de selección de rol |
| `components/DemoBanner.tsx` | Banner "ENTORNO DEMO" visible en todas las páginas |
| `app/(admin)/layout.tsx` | Inyecta DemoBanner si usuario es demo |
| `app/(enfermero)/enfermero/layout.tsx` | Inyecta DemoBanner |
| `app/(familiar)/familiar/layout.tsx` | Inyecta DemoBanner |

---

## Detección de sesión demo

`DemoBanner` verifica server-side:

```ts
user?.email?.endsWith('@demo.abastemed.com')
```

Si la condición es verdadera, muestra el banner amarillo. No se necesita variable de entorno ni flag adicional.

---

## Integraciones deshabilitadas en demo

Las siguientes integraciones **no se ejecutan** en demo porque:

- Los emails van a `*@demo.abastemed.com` (dominios ficticios que nadie recibirá)
- No hay integración de WhatsApp activa en el código actual
- Los pagos son simulados (no hay pasarela conectada)
- La facturación es ficticia

**No se requiere acción adicional** para deshabilitar integraciones en el entorno demo actual.

---

## Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Demo user ve datos reales | Imposible: RLS escopea por coordinador_id/paciente_id. Demo coordinator solo ve caso demo. |
| Reset borra datos reales | Imposible: el DELETE filtra por UUIDs fijos (`dddddddd-...`) y organization_id demo. |
| Email enviado a persona real | No aplica: el email es `*@demo.abastemed.com`, no existe. |
| Cruce en reportes financieros | Imposible: financial_incomes/expenses filtran por organization_id demo. |
| Usuario demo accede a `/admin` prod | No aplica: los portales son los mismos, los datos son diferentes por RLS. |

---

## Limitaciones actuales

1. **No existe reporte semanal HTML consolidado** — actualmente hay reportes de turno individuales pero no una vista de resumen semanal. Esto es una deuda de producto, no de la demo.

2. **No existe PDF de reporte** — la página `/imprimir/recibos/[id]` existe, pero no hay reporte clínico imprimible aún.

3. **No existe guided tour** — los recorridos son narrativos (descritos en guiones), no hay tooltips automáticos implementados.

4. **Fernanda tiene turno D-2 en estado `en_revision`** — esto muestra el flujo de validación incompleta, que es intencional para demostrar la funcionalidad.

---

## Próximas mejoras sugeridas

- [ ] Página `/demo/recorrido` con pasos guiados (sin librería externa, con URL params)
- [ ] Reporte semanal HTML consolidado en `/casos/[id]/reporte-semanal`
- [ ] Vista `/demo/reset` protegida por contraseña para que el equipo de ventas resetee la demo sin SQL Editor
- [ ] Analytics de recorrido (qué páginas visita cada perfil demo)
