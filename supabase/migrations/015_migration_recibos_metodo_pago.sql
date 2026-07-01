-- ============================================================
-- ABASTEMED — Recibos: método de pago, estado y datos de liquidación
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Método de pago elegido por el cliente
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT NOT NULL DEFAULT 'por_coordinar'
    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'otro', 'por_coordinar'));

-- Estado del cobro: determina si el documento es "Nota de cobro" o "Recibo de pago"
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado', 'cancelado'));

-- Datos de liquidación (solo aplican cuando estado = 'pagado')
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS fecha_pago DATE;

ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS referencia_pago TEXT;

-- Los recibos existentes quedan con metodo_pago='por_coordinar' y estado='pendiente'
-- por los valores DEFAULT anteriores; pueden editarse desde el formulario de recibos.
