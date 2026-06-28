-- DDL script to create critical_alerts table
CREATE TABLE IF NOT EXISTS critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'critico', -- 'critico' | 'info' | 'sismo'
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) to match reports and onu_report
ALTER TABLE critical_alerts DISABLE ROW LEVEL SECURITY;

-- Insert initial seed alert
INSERT INTO critical_alerts (mensaje, tipo, activo)
VALUES (
  '⚠️ ALERTA DE SEGURIDAD: Réplicas menores registradas en la costa central. Mantenga la calma y ubique las salidas de emergencia.',
  'critico',
  true
) ON CONFLICT DO NOTHING;
