-- 1. Crear la tabla de reportes principal si no existe
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  confirmations INTEGER DEFAULT 0,
  "creadoAt" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  nombre TEXT,
  direccion TEXT,
  contacto TEXT,
  aceptan TEXT,
  region TEXT,
  whatsapp TEXT,
  aprobado BOOLEAN DEFAULT true,
  "creadorAnonimo" BOOLEAN DEFAULT false,
  fuente TEXT
);

-- Habilitar Row Level Security (RLS) para la tabla reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para reports
CREATE POLICY "Allow public read of approved reports" ON reports 
  FOR SELECT USING (aprobado = true OR (auth.jwt() ->> 'email') IN (SELECT email FROM admins));

CREATE POLICY "Allow public insert of reports" ON reports 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of reports" ON reports 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete by creator or admin" ON reports 
  FOR DELETE USING (
    (auth.jwt() ->> 'email') IN (SELECT email FROM admins) 
    OR id LIKE '%-creator-' || (auth.jwt() ->> 'email')
  );

-- 2. Crear la tabla de administradores autorizados
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS) para admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para admins
CREATE POLICY "Allow public read of admins" ON admins 
  FOR SELECT USING (true);

CREATE POLICY "Allow write access to owner only" ON admins 
  FOR ALL USING (auth.jwt() ->> 'email' = 'sergioantia11@gmail.com');

-- 3. Insertar al dueño de la app como administrador por defecto
INSERT INTO admins (email) VALUES ('sergioantia11@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 4. Crear la tabla de reporte ONU
CREATE TABLE IF NOT EXISTS onu_report (
  id INT PRIMARY KEY DEFAULT 1,
  fallecidos INT DEFAULT 1430,
  heridos INT DEFAULT 3360,
  desaparecidos TEXT DEFAULT '+50,000',
  descripcion TEXT DEFAULT 'Doblete sísmico Mw 7.2 y 7.5 con epicentro en Yaracuy. Zonas más afectadas: Caracas, La Guaira, Miranda, Carabobo y Yaracuy.',
  respuesta TEXT DEFAULT 'La ONU liberó USD 15 millones de emergencia. Más de 30 equipos USAR de más de 20 países con 1,600+ especialistas INSARAG operan activamente.',
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO onu_report (id, fallecidos, heridos, desaparecidos, descripcion, respuesta)
VALUES (1, 1430, 3360, '+50,000', 'Doblete sísmico Mw 7.2 y 7.5 con epicentro en Yaracuy. Zonas más afectadas: Caracas, La Guaira, Miranda, Carabobo y Yaracuy.', 'La ONU liberó USD 15 millones de emergencia. Más de 30 equipos USAR de más de 20 países con 1,600+ especialistas INSARAG operan activamente.')
ON CONFLICT (id) DO NOTHING;

-- Habilitar Row Level Security (RLS) para onu_report
ALTER TABLE onu_report ENABLE ROW LEVEL SECURITY;

-- Políticas para onu_report
CREATE POLICY "Allow public read of onu_report" ON onu_report 
  FOR SELECT USING (true);

CREATE POLICY "Allow admins write onu_report" ON onu_report 
  FOR UPDATE USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

-- 5. Crear la tabla de alertas críticas
CREATE TABLE IF NOT EXISTS critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'critico', -- 'critico' | 'info' | 'sismo'
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para critical_alerts
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para critical_alerts
CREATE POLICY "Allow public read of critical_alerts" ON critical_alerts 
  FOR SELECT USING (true);

CREATE POLICY "Allow admins write critical_alerts" ON critical_alerts 
  FOR ALL USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));

-- Insertar alerta inicial de prueba
INSERT INTO critical_alerts (mensaje, tipo, activo)
VALUES (
  '⚠️ ALERTA DE SEGURIDAD: Réplicas menores registradas en la costa central. Mantenga la calma y ubique las salidas de emergencia.',
  'critico',
  true
) ON CONFLICT DO NOTHING;


-- 6. Habilitar la replicación en tiempo real (Supabase Realtime) para la tabla reports
-- Nota: Si ya está agregada, arrojará un aviso de que ya es miembro, lo cual es correcto y seguro.
alter publication supabase_realtime add table reports;
