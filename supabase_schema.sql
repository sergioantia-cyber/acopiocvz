-- 1. Agregar columnas de moderación a la tabla de reportes existente
ALTER TABLE reports ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT true;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS "creadorAnonimo" BOOLEAN DEFAULT false;

-- 2. Crear la tabla de administradores autorizados
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Insertar al dueño de la app como administrador por defecto
INSERT INTO admins (email) VALUES ('sergioantia11@gmail.com')
ON CONFLICT (email) DO NOTHING;
