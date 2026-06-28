-- Crear la tabla de psicólogos
CREATE TABLE IF NOT EXISTS psychologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  titulo TEXT NOT NULL,
  especialidad TEXT NOT NULL,
  descripcion TEXT,
  telefono TEXT,
  whatsapp TEXT,
  email TEXT,
  foto_url TEXT,
  idiomas TEXT,
  modalidad TEXT DEFAULT 'online',
  booking_url TEXT,
  es_institucion BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  tipo_servicio TEXT DEFAULT 'gratuito', -- 'gratuito' o 'social'
  monto_tarifa NUMERIC DEFAULT 0,
  moneda_tarifa TEXT DEFAULT 'USD',
  verificado BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS) para la tabla psychologists
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para psychologists
CREATE POLICY "Allow public read of psychologists" ON psychologists 
  FOR SELECT USING (true);

CREATE POLICY "Allow write for self or admins" ON psychologists 
  FOR ALL USING (
    (auth.jwt() ->> 'email') IN (SELECT email FROM admins)
    OR email = auth.jwt() ->> 'email'
  );

-- Agregar columnas a una tabla existente (por si ya existe la tabla)
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS tipo_servicio TEXT DEFAULT 'gratuito';
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS monto_tarifa NUMERIC DEFAULT 0;
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS moneda_tarifa TEXT DEFAULT 'USD';
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT true;

-- Crear la tabla de permisos de psicólogo
CREATE TABLE IF NOT EXISTS psychologist_permissions (
  email TEXT PRIMARY KEY,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para la tabla psychologist_permissions
ALTER TABLE psychologist_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para psychologist_permissions
CREATE POLICY "Allow public read of psychologist_permissions" ON psychologist_permissions 
  FOR SELECT USING (true);

CREATE POLICY "Allow admins write psychologist_permissions" ON psychologist_permissions 
  FOR ALL USING ((auth.jwt() ->> 'email') IN (SELECT email FROM admins));
