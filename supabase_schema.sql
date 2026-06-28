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

-- 2. Crear la tabla de administradores autorizados
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Insertar al dueño de la app como administrador por defecto
INSERT INTO admins (email) VALUES ('sergioantia11@gmail.com')
ON CONFLICT (email) DO NOTHING;
