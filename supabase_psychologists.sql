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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
