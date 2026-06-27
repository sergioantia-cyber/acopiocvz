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
}
