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
  "creadorAnonimo" BOOLEAN DEFAULT false
);

-- Deshabilitar RLS para reports para permitir lecturas y escrituras públicas
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- 2. Crear la tabla de administradores autorizados
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Deshabilitar RLS para admins para permitir lecturas y modificaciones del listado de administradores
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

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

-- Deshabilitar RLS para onu_report para permitir lecturas y modificaciones
ALTER TABLE onu_report DISABLE ROW LEVEL SECURITY;

-- 5. Crear la tabla de alertas críticas
CREATE TABLE IF NOT EXISTS critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'critico', -- 'critico' | 'info' | 'sismo'
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Deshabilitar RLS para critical_alerts para permitir lecturas y escrituras
ALTER TABLE critical_alerts DISABLE ROW LEVEL SECURITY;

-- Insertar alerta inicial de prueba
INSERT INTO critical_alerts (mensaje, tipo, activo)
VALUES (
  '⚠️ ALERTA DE SEGURIDAD: Réplicas menores registradas en la costa central. Mantenga la calma y ubique las salidas de emergencia.',
  'critico',
  true
) ON CONFLICT DO NOTHING;

