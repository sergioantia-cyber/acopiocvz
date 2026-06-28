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

-- Deshabilitar Row Level Security (RLS) para permitir que la app inserte y modifique
ALTER TABLE psychologists DISABLE ROW LEVEL SECURITY;

-- Agregar columnas a una tabla existente (por si ya existe la tabla)
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS tipo_servicio TEXT DEFAULT 'gratuito';
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS monto_tarifa NUMERIC DEFAULT 0;
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS moneda_tarifa TEXT DEFAULT 'USD';
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT true;
