-- ════════════════════════════════════════════════════════════
-- Migración 011: Tabla de Asistencia y Auditoría de Personal
-- ════════════════════════════════════════════════════════════

CREATE TABLE staff_attendance (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      VARCHAR(20)  NOT NULL, -- 'CLOCK_IN' (Entrada), 'CLOCK_OUT' (Salida)
  timestamp       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  photo_url       TEXT,                  -- URL o path relativo de la foto guardada
  latitude        NUMERIC(10,8),         -- Coordenadas GPS decimales
  longitude       NUMERIC(11,8),         -- Coordenadas GPS decimales
  ip_address      VARCHAR(60)  NOT NULL, -- IP del cliente
  user_agent      TEXT,                  -- Datos del navegador/sistema operativo
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_attendance_user_time ON staff_attendance(tenant_id, user_id, timestamp DESC);
CREATE INDEX idx_attendance_branch_time ON staff_attendance(tenant_id, branch_id, timestamp DESC);
