export interface PuntoReportado {
  id: string;
  tipo: "ofrece" | "necesita";
  categoria: "energia" | "senal" | "suministros" | "salud" | "peligro" | "movilidad";
  descripcion: string;
  lat: number;
  lng: number;
  confirmations: number;
  creadoAt: string;
  expiresAt: string;
  fuente?: string; // e.g. "Localizados VE", "Caracas Ayuda", "Ayuda por Venezuela"
  
  // Detailed popup fields
  nombre?: string;
  direccion?: string;
  contacto?: string;
  aceptan?: string;
  region?: string;
  whatsapp?: string;

  // Moderation fields
  aprobado?: boolean;
  creadorAnonimo?: boolean;
}

export interface Psychologist {
  id: string;
  nombre: string;
  titulo: string;
  especialidad: string;
  descripcion?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  foto_url?: string;
  idiomas?: string;
  modalidad?: string;
  booking_url?: string;
  es_institucion?: boolean;
  activo?: boolean;
  created_at?: string;
  tipo_servicio?: "gratuito" | "social";
  monto_tarifa?: number;
  moneda_tarifa?: string;
  verificado?: boolean;
}

