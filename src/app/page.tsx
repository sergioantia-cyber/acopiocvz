"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  ListFilter,
  FileSpreadsheet,
  Plus,
  Compass,
  AlertTriangle,
  Heart,
  Share2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Settings,
  HelpCircle,
} from "lucide-react";
import { PuntoReportado, Psychologist } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const MapaColaborativo = dynamic(() => import("../components/MapaColaborativo"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Cargando mapa interactivo...</p>
      </div>
    </div>
  ),
});

const MOCK_PUNTOS: PuntoReportado[] = [];

const MOCK_PERSONS: any[] = [];

// Main filter categories - clear, user-friendly, pill-style
const MAIN_FILTERS = [
  {
    id: "hospital",
    name: "Hospitales",
    shortName: "Hospitales",
    emoji: "🏥",
    color: "from-rose-600 to-rose-500",
    border: "border-rose-500/50",
    glow: "shadow-rose-500/25",
    ring: "ring-rose-500/40",
    bg: "bg-rose-950/60",
    textActive: "text-rose-100",
    description: "Centros médicos, clínicas y puestos de salud activos"
  },
  {
    id: "acopio",
    name: "Centros de Acopio",
    shortName: "Acopio",
    emoji: "📦",
    color: "from-sky-600 to-sky-500",
    border: "border-sky-500/50",
    glow: "shadow-sky-500/25",
    ring: "ring-sky-500/40",
    bg: "bg-sky-950/60",
    textActive: "text-sky-100",
    description: "Puntos de recolección de agua, alimentos, ropa y suministros"
  },
  {
    id: "emergencia",
    name: "Emergencias",
    shortName: "Emergencias",
    emoji: "🆘",
    color: "from-orange-600 to-amber-500",
    border: "border-orange-500/50",
    glow: "shadow-orange-500/25",
    ring: "ring-orange-500/40",
    bg: "bg-orange-950/60",
    textActive: "text-orange-100",
    description: "Reportes de peligro, rescate, deslaves e inundaciones activos"
  },
  {
    id: "vehiculos",
    name: "Vehículos / Maquinaria",
    shortName: "Vehículos",
    emoji: "🚛",
    color: "from-teal-600 to-teal-500",
    border: "border-teal-500/50",
    glow: "shadow-teal-500/25",
    ring: "ring-teal-500/40",
    bg: "bg-teal-950/60",
    textActive: "text-teal-100",
    description: "Camiones de suministros, maquinaria pesada y transporte de ayuda"
  },
  {
    id: "wifi",
    name: "Puntos WiFi",
    shortName: "WiFi",
    emoji: "🌐",
    color: "from-violet-600 to-violet-500",
    border: "border-violet-500/50",
    glow: "shadow-violet-500/25",
    ring: "ring-violet-500/40",
    bg: "bg-violet-950/60",
    textActive: "text-violet-100",
    description: "Lugares con señal WiFi gratuita o acceso a internet comunitario"
  },
];


interface SupplyElement {
  num: number;
  symbol: string;
  name: string;
  emoji: string;
  category: "alimentos" | "ropa" | "servicios" | "salud" | "higiene";
  description: string;
  row: number;
  col: number;
}

const PERIODIC_SUPPLIES: SupplyElement[] = [
  // --- SECTOR 1: Servicios & Salud (Col 1-3) ---
  // Servicios
  { num: 1, symbol: "Lz", name: "Luz", emoji: "💡", category: "servicios", description: "Servicio eléctrico activo en el centro", row: 1, col: 1 },
  { num: 2, symbol: "Wf", name: "WiFi", emoji: "📶", category: "servicios", description: "Acceso a internet inalámbrico", row: 1, col: 2 },
  { num: 3, symbol: "Bt", name: "Batería", emoji: "🔋", category: "servicios", description: "Pilas y acumuladores portátiles", row: 1, col: 3 },
  
  // Salud
  { num: 4, symbol: "Md", name: "Med.", emoji: "💊", category: "salud", description: "Medicamentos de uso común (analgésicos, antipiréticos)", row: 2, col: 1 },
  { num: 5, symbol: "Pa", name: "Auxilio", emoji: "🩹", category: "salud", description: "Material de curación, vendas y desinfección", row: 2, col: 2 },
  { num: 6, symbol: "In", name: "Insulina", emoji: "💉", category: "salud", description: "Insulina y jeringas para pacientes diabéticos", row: 2, col: 3 },
  { num: 7, symbol: "Cr", name: "Crema", emoji: "🧴", category: "salud", description: "Cremas antibióticas, hidratantes o para quemaduras", row: 3, col: 1 },
  { num: 8, symbol: "Al", name: "Alcohol", emoji: "🧪", category: "salud", description: "Alcohol antiséptico para desinfectar heridas", row: 3, col: 2 },
  { num: 9, symbol: "Su", name: "Suero", emoji: "🥤", category: "salud", description: "Suero oral o intravenoso para rehidratación", row: 3, col: 3 },

  // --- SECTOR 2: Higiene (Col 5-6) ---
  { num: 10, symbol: "Kh", name: "Higiene", emoji: "🧼", category: "higiene", description: "Jabón, desodorante, pasta y cepillos de dientes", row: 2, col: 5 },
  { num: 11, symbol: "Pn", name: "Pañal", emoji: "👶", category: "higiene", description: "Pañales desechables para bebés o adultos", row: 2, col: 6 },

  // --- SECTOR 3: Alimentos (Col 8-9) ---
  { num: 12, symbol: "Ag", name: "Agua", emoji: "💧", category: "alimentos", description: "Agua potable o embotellada", row: 1, col: 8 },
  { num: 13, symbol: "Az", name: "Azúcar", emoji: "🍬", category: "alimentos", description: "Azúcar refinada o endulzantes", row: 2, col: 8 },
  { num: 14, symbol: "Ha", name: "Harina", emoji: "🌾", category: "alimentos", description: "Harina de maíz precocido o trigo", row: 2, col: 9 },
  { num: 15, symbol: "Lt", name: "Lata", emoji: "🥫", category: "alimentos", description: "Alimentos enlatados no perecederos", row: 3, col: 8 },
  { num: 16, symbol: "Le", name: "Leche", emoji: "🥛", category: "alimentos", description: "Leche en polvo o líquida pasteurizada", row: 3, col: 9 },
  { num: 17, symbol: "Ar", name: "Arroz", emoji: "🍚", category: "alimentos", description: "Arroz blanco o integral", row: 4, col: 8 },
  { num: 18, symbol: "Gr", name: "Granos", emoji: "🫘", category: "alimentos", description: "Frijoles, lentejas, caraotas", row: 4, col: 9 },

  // --- SECTOR 4: Ropa (Col 11-12) ---
  { num: 19, symbol: "Me", name: "Medias", emoji: "🧦", category: "ropa", description: "Medias de abrigo y uso diario", row: 1, col: 11 },
  { num: 20, symbol: "Ri", name: "Ropa I.", emoji: "🩲", category: "ropa", description: "Ropa íntima nueva o limpia", row: 1, col: 12 },
  { num: 21, symbol: "Sh", name: "Shorts", emoji: "🩳", category: "ropa", description: "Pantalones cortos o shorts", row: 2, col: 11 },
  { num: 22, symbol: "Ca", name: "Camisa", emoji: "👔", category: "ropa", description: "Camisas limpias", row: 2, col: 12 },
  { num: 23, symbol: "Fr", name: "Franela", emoji: "👕", category: "ropa", description: "Franelas o camisetas cómodas", row: 3, col: 11 },
  { num: 24, symbol: "Mn", name: "Manta", emoji: "🧣", category: "ropa", description: "Mantas para el frío", row: 3, col: 12 },
  { num: 25, symbol: "Cb", name: "Cobija", emoji: "🛌", category: "ropa", description: "Cobijas, edredones o sábanas", row: 4, col: 11 },
];

export default function HomePage() {
  const [puntos, setPuntos] = useState<PuntoReportado[]>([]);
  const [localizados, setLocalizados] = useState<any[]>([]);
  const [desaparecidosQuery, setDesaparecidosQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<"mapa" | "sheets">("mapa");
  const [isReporting, setIsReporting] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filters State
  const [tipoFilter, setTipoFilter] = useState<"todos" | "ofrece" | "necesita">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeElementMenu, setActiveElementMenu] = useState<string | null>(null);
  const [activeMainFilter, setActiveMainFilter] = useState<string | null>(null);

  // Admin & Moderation states
  const [admins, setAdmins] = useState<string[]>([]);
  const [adminsWithRoles, setAdminsWithRoles] = useState<{ email: string; role: string }[]>([]);
  const [authorizedPsychs, setAuthorizedPsychs] = useState<string[]>([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isONUReportOpen, setIsONUReportOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<string>("center_admin");
  const [newPsychPermEmail, setNewPsychPermEmail] = useState("");

  // Dynamic ONU Report statistics states
  const [onuFallecidos, setOnuFallecidos] = useState(1430);
  const [onuHeridos, setOnuHeridos] = useState(3360);
  const [onuDesaparecidos, setOnuDesaparecidos] = useState("+50,000");
  const [onuDescripcion, setOnuDescripcion] = useState("Doblete sísmico Mw 7.2 y 7.5 con epicentro en Yaracuy. Zonas más afectadas: Caracas, La Guaira, Miranda, Carabobo y Yaracuy.");
  const [onuRespuesta, setOnuRespuesta] = useState("La ONU liberó USD 15 millones de emergencia. Más de 30 equipos USAR de más de 20 países con 1,600+ especialistas INSARAG operan activamente.");
  
  const [isONUEditing, setIsONUEditing] = useState(false);
  const [editOnuFallecidos, setEditOnuFallecidos] = useState(1430);
  const [editOnuHeridos, setEditOnuHeridos] = useState(3360);
  const [editOnuDesaparecidos, setEditOnuDesaparecidos] = useState("+50,000");
  const [editOnuDescripcion, setEditOnuDescripcion] = useState("");
  const [editOnuRespuesta, setEditOnuRespuesta] = useState("");

  const [cercaDeMi, setCercaDeMi] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Dragging States for Left Sidebar / Floating Panel
  const [panelPos, setPanelPos] = useState({ x: 16, y: 174 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Marker Move History (for Ctrl+Z undo)
  const [moveHistory, setMoveHistory] = useState<{ id: string; lat: number; lng: number }[]>([]);

  // Pending Marker Move (for confirmation popup)
  const [pendingMove, setPendingMove] = useState<{
    id: string;
    nombre: string;
    lat: number;
    lng: number;
    prevLat: number;
    prevLng: number;
  } | null>(null);

  // Auth State
  const [user, setUser] = useState<{ email: string; name: string; avatar: string } | null>(null);

  const userRole = (() => {
    if (!user) return null;
    const email = user.email.toLowerCase();
    
    if (email === "sergioantia11@gmail.com") return "owner";
    
    const adminEntry = adminsWithRoles.find((a) => a.email === email);
    if (adminEntry) return adminEntry.role;
    
    if (email === "colaborador@ayudaparavenezuela.com") return "ceo";
    
    return null;
  })();

  const isOwner = userRole === "owner";
  const isCeo = userRole === "ceo";
  const isCenterAdmin = userRole === "center_admin";
  const isAdmin = isOwner || isCeo;

  const isPsychologist = !!(user && (
    authorizedPsychs.includes(user.email.toLowerCase()) ||
    isAdmin
  ));

  // Edit Point States
  const [editingPunto, setEditingPunto] = useState<PuntoReportado | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editContacto, setEditContacto] = useState("");
  const [editAceptan, setEditAceptan] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editPercentages, setEditPercentages] = useState<Record<string, number>>({});
  const [editLat, setEditLat] = useState<number>(0);
  const [editLng, setEditLng] = useState<number>(0);

  // Psychological Assistance States
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [isPsychOpen, setIsPsychOpen] = useState(false);
  const [reconectaSites, setReconectaSites] = useState<PuntoReportado[]>([]);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isNewsFormOpen, setIsNewsFormOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<PuntoReportado | null>(null);
  const [isSeismicOpen, setIsSeismicOpen] = useState(false);
  const [isSuppliesOpen, setIsSuppliesOpen] = useState(false);
  const [activeSuppliesPunto, setActiveSuppliesPunto] = useState<PuntoReportado | null>(null);
  const [supplyStates, setSupplyStates] = useState<Record<string, boolean>>({});
  const [hoveredElement, setHoveredElement] = useState<any>(null);
  const [mapViewControllerTrigger, setMapViewControllerTrigger] = useState<{ center: [number, number]; zoom: number; timestamp: number } | null>(null);
  const [supplySearchQuery, setSupplySearchQuery] = useState("");
  const [selectedSupplyCategory, setSelectedSupplyCategory] = useState<string>("todos");
  const [isPsychFormOpen, setIsPsychFormOpen] = useState(false);
  const [editingPsych, setEditingPsych] = useState<Psychologist | null>(null);
  const [searchPsych, setSearchPsych] = useState("");
  const [expandedPsychId, setExpandedPsychId] = useState<string | null>(null);

  // Psychologist Form State
  const [psychNombre, setPsychNombre] = useState("");
  const [psychTitulo, setPsychTitulo] = useState("");
  const [psychEspecialidad, setPsychEspecialidad] = useState("");
  const [psychDescripcion, setPsychDescripcion] = useState("");
  const [psychTelefono, setPsychTelefono] = useState("");
  const [psychWhatsapp, setPsychWhatsapp] = useState("");
  const [psychEmail, setPsychEmail] = useState("");
  const [psychFotoUrl, setPsychFotoUrl] = useState("");
  const [psychIdiomas, setPsychIdiomas] = useState("Español");
  const [psychModalidad, setPsychModalidad] = useState("online");
  const [psychBookingUrl, setPsychBookingUrl] = useState("");
  const [psychEsInstitucion, setPsychEsInstitucion] = useState(false);
  const [psychTipoServicio, setPsychTipoServicio] = useState<"gratuito" | "social">("gratuito");
  const [psychMontoTarifa, setPsychMontoTarifa] = useState<number>(0);
  const [psychMonedaTarifa, setPsychMonedaTarifa] = useState<string>("USD");
  const [psychVerificado, setPsychVerificado] = useState<boolean>(true);
  const [psychActiveTab, setPsychActiveTab] = useState<"todos" | "gratuito" | "social" | "lineas">("todos");
  const [activeBookingUrl, setActiveBookingUrl] = useState<string | null>(null);

  // Critical Alerts States
  const [alerts, setAlerts] = useState<{ manual: any[], seismic: any[] }>({ manual: [], seismic: [] });
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [newAlertText, setNewAlertText] = useState("");
  const [newAlertTipo, setNewAlertTipo] = useState<"critico" | "info">("critico");

  // Form State
  const [formTipo, setFormTipo] = useState<"ofrece" | "necesita">("ofrece");
  const [formCategoria, setFormCategoria] = useState<PuntoReportado["categoria"]>("suministros");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formDireccion, setFormDireccion] = useState("");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Auth functions
  const handleGoogleLogin = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : "",
        }
      });
    } else {
      // Simulate Google Auth
      setUser({
        email: "colaborador@ayudaparavenezuela.com",
        name: "Sergio Antía (Colaborador)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces",
      });
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  // Start Editing Point
  const handleRepublishNews = async (noticia: PuntoReportado) => {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
    const updatedNoticia = {
      ...noticia,
      creadoAt: now,
      expiresAt,
    };
    
    // Update local state
    const updated = puntos.map((p) => (p.id === noticia.id ? updatedNoticia : p));
    setPuntos(updated);
    localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

    // Force updates to other clients by editing on Supabase
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("reports")
        .update({ creadoAt: now, expiresAt })
        .eq("id", noticia.id);
      if (error) {
        console.error("Error republishing news in Supabase:", error);
      }
    }
    alert("¡Noticia republicada con éxito! Se ha movido al inicio y notificado a los usuarios.");
  };

  const handleOpenSupplies = (punto: PuntoReportado) => {
    setActiveSuppliesPunto(punto);
    setSupplySearchQuery("");
    setSelectedSupplyCategory("todos");
    
    // Load existing supply_details or initialize to default (all true)
    const initialStates: Record<string, boolean> = {};
    
    PERIODIC_SUPPLIES.forEach((elem) => {
      if (punto.supply_details && typeof punto.supply_details[elem.symbol] === "boolean") {
        initialStates[elem.symbol] = punto.supply_details[elem.symbol];
      } else {
        initialStates[elem.symbol] = true;
      }
    });
    
    setSupplyStates(initialStates);
    setIsSuppliesOpen(true);
  };

  const handleSaveSupplies = async () => {
    if (!activeSuppliesPunto) return;

    const updatedPunto: PuntoReportado = {
      ...activeSuppliesPunto,
      supply_details: supplyStates,
    };

    const updated = puntos.map((p) => (p.id === activeSuppliesPunto.id ? updatedPunto : p));
    setPuntos(updated);
    localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("reports")
        .update({ supply_details: supplyStates })
        .eq("id", activeSuppliesPunto.id);
      if (error) {
        console.error("Error saving supply details in Supabase:", error);
      }
    }

    setIsSuppliesOpen(false);
    setActiveSuppliesPunto(null);
    alert("¡Inventario de suministros actualizado con éxito!");
  };

  const handleStartEdit = (punto: PuntoReportado) => {
    if (!user) {
      alert("Por favor inicia sesión con Google en la barra superior para actualizar la información de este punto.");
      return;
    }
    setEditingPunto(punto);
    setEditNombre(punto.nombre || "");
    setEditDireccion(punto.direccion || "");
    setEditContacto(punto.contacto || "");
    setEditAceptan(punto.aceptan || "");
    setEditDescripcion(punto.descripcion || "");
    setEditLat(punto.lat);
    setEditLng(punto.lng);
    
    // Default percentages based on resource type
    setEditPercentages({
      Ag: punto.descripcion.toLowerCase().includes("agua") || (punto.aceptan && punto.aceptan.toLowerCase().includes("agua")) ? 90 : 68,
      Al: punto.descripcion.toLowerCase().includes("comida") || punto.descripcion.toLowerCase().includes("alimento") ? 85 : 45,
      El: punto.categoria === "energia" ? 95 : 22,
      Co: punto.categoria === "senal" ? 95 : 51,
      Me: punto.categoria === "salud" ? 90 : 30,
      Cm: punto.descripcion.toLowerCase().includes("cama") || punto.descripcion.toLowerCase().includes("refugio") ? 80 : 40,
      Tr: punto.categoria === "movilidad" ? 90 : 58,
      Pe: punto.categoria === "peligro" ? 85 : 12,
    });
  };

  // Save Edited Point
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPunto) return;

    const updatedPunto: PuntoReportado = {
      ...editingPunto,
      nombre: editNombre || undefined,
      direccion: editDireccion || undefined,
      contacto: editContacto || undefined,
      aceptan: editAceptan || undefined,
      descripcion: editDescripcion,
      lat: editLat,
      lng: editLng,
    };

    // Update in local state array
    const updated = puntos.map((p) => (p.id === editingPunto.id ? updatedPunto : p));
    setPuntos(updated);
    
    // Save to localStorage if it's local
    if (!editingPunto.id.startsWith("caracasayuda-") && !editingPunto.id.startsWith("ayudaporvenezuela-") && !editingPunto.id.startsWith("localizados-")) {
      localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated.filter(p => !p.id.startsWith("caracasayuda-") && !p.id.startsWith("ayudaporvenezuela-") && !p.id.startsWith("localizados-"))));
    }

    // Write back to Supabase if configured!
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .upsert({
          id: editingPunto.id,
          nombre: editNombre,
          direccion: editDireccion,
          contacto: editContacto,
          aceptan: editAceptan,
          descripcion: editDescripcion,
          categoria: editingPunto.categoria,
          tipo: editingPunto.tipo,
          lat: editLat,
          lng: editLng,
          expiresAt: editingPunto.expiresAt,
          creadoAt: editingPunto.creadoAt,
        });
    }

    // (percentages UI removed  —  now using main category filters)

    setEditingPunto(null);
    alert("¡Centro actualizado con éxito en tiempo real!");
  };

  // Admin moderation callbacks
  const handleApprovePunto = async (id: string) => {
    if (!isAdmin) return;
    const updated = puntos.map((p) => (p.id === id ? { ...p, aprobado: true } : p));
    setPuntos(updated);
    
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({ aprobado: true })
        .eq("id", id);
    }
    alert("¡Reporte aprobado con éxito!");
  };

  const handleDeletePunto = async (id: string) => {
    const targetPunto = puntos.find((p) => p.id === id);
    const isCreator = !!(
      targetPunto &&
      user &&
      targetPunto.id.includes(`-creator-${user.email.toLowerCase()}`)
    );

    if (!isAdmin && !isCreator && !isOwner) {
      alert("No tienes permisos para eliminar este punto. Solo el creador, los administradores o el dueño de la app pueden hacerlo.");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar/rechazar este punto?")) return;
    const updated = puntos.filter((p) => p.id !== id);
    setPuntos(updated);
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Error deleting report in Supabase:", error);
      }
    }
    alert("Reporte eliminado.");
  };

  const handleMarkerMove = async (
    id: string,
    newLat: number,
    newLng: number,
    prevLat: number,
    prevLng: number
  ) => {
    if (!isOwner) return;

    const puntoObj = puntos.find((p) => p.id === id);
    const nombre = puntoObj ? (puntoObj.nombre || puntoObj.categoria) : "Marcador";

    // Show confirmation modal first
    setPendingMove({
      id,
      nombre,
      lat: newLat,
      lng: newLng,
      prevLat,
      prevLng,
    });

    // Optimistically update local state so the marker stays where it was dropped while confirming
    setPuntos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lat: newLat, lng: newLng } : p))
    );
  };

  const confirmMarkerMove = async () => {
    if (!pendingMove || !isOwner) return;

    const { id, lat, lng, prevLat, prevLng } = pendingMove;

    // Push previous position to history stack (for Ctrl+Z undo)
    setMoveHistory((prev) => [...prev, { id, lat: prevLat, lng: prevLng }]);

    // Persist new position to Supabase
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({ lat, lng })
        .eq("id", id);
    }

    setPendingMove(null);
  };

  const cancelMarkerMove = () => {
    if (!pendingMove) return;

    // Revert the local state back to the original position
    setPuntos((prev) =>
      prev.map((p) =>
        p.id === pendingMove.id
          ? { ...p, lat: pendingMove.prevLat, lng: pendingMove.prevLng }
          : p
      )
    );

    setPendingMove(null);
  };

  const handleUndoMove = async () => {
    if (!isOwner || moveHistory.length === 0) return;

    const last = moveHistory[moveHistory.length - 1];
    setMoveHistory((prev) => prev.slice(0, -1));

    // Restore previous position in local state
    setPuntos((prev) =>
      prev.map((p) => (p.id === last.id ? { ...p, lat: last.lat, lng: last.lng } : p))
    );

    // Persist restored position to Supabase
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({ lat: last.lat, lng: last.lng })
        .eq("id", last.id);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !newAdminEmail.trim()) return;
    
    const emailToInsert = newAdminEmail.trim().toLowerCase();
    
    if (admins.includes(emailToInsert) || emailToInsert === "sergioantia11@gmail.com") {
      alert("Este correo ya tiene permisos de administrador.");
      return;
    }
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("admins").insert([{ email: emailToInsert }]);
      if (error) {
        alert("Error al agregar administrador: " + error.message);
        return;
      }
    }
    
    setAdmins([...admins, emailToInsert]);
    setNewAdminEmail("");
    alert(`¡Se han otorgado permisos de administrador a ${emailToInsert}!`);
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!isOwner) return;
    if (email === "sergioantia11@gmail.com") {
      alert("No puedes quitarle permisos al dueño de la aplicación.");
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas remover a ${email} como administrador?`)) return;
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("admins").delete().eq("email", email);
      if (error) {
        alert("Error al eliminar administrador: " + error.message);
        return;
      }
    }
    
    setAdmins(admins.filter((a) => a !== email));
    setNewAdminEmail("");
    alert(`¡Se han revocado los permisos de administrador a ${email}!`);
  };

  const handleAddPsychPerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newPsychPermEmail.trim()) return;
    
    const emailToInsert = newPsychPermEmail.trim().toLowerCase();
    
    if (authorizedPsychs.includes(emailToInsert)) {
      alert("Este correo ya tiene permisos de psicólogo.");
      return;
    }
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("psychologist_permissions").insert([{ email: emailToInsert }]);
      if (error) {
        alert("Error al autorizar psicólogo: " + error.message);
        return;
      }
    }
    
    const updatedList = [...authorizedPsychs, emailToInsert];
    setAuthorizedPsychs(updatedList);
    localStorage.setItem("punto_de_apoyo_authorized_psychs", JSON.stringify(updatedList));
    setNewPsychPermEmail("");
    alert(`¡Se han otorgado permisos de psicólogo a ${emailToInsert}!`);
  };

  const handleRemovePsychPerm = async (email: string) => {
    if (!isAdmin) return;
    if (!confirm(`¿Estás seguro de que deseas remover a ${email} como psicólogo autorizado?`)) return;
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("psychologist_permissions").delete().eq("email", email);
      if (error) {
        alert("Error al remover psicólogo: " + error.message);
        return;
      }
    }
    
    const updatedList = authorizedPsychs.filter((a) => a !== email);
    setAuthorizedPsychs(updatedList);
    localStorage.setItem("punto_de_apoyo_authorized_psychs", JSON.stringify(updatedList));
    alert(`¡Se han revocado los permisos de psicólogo a ${email}!`);
  };

  const handleSavePsychologist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!psychNombre || !psychEspecialidad || (!psychEsInstitucion && !psychTitulo)) {
      alert("Nombre, especialidad y título (para profesionales) son obligatorios");
      return;
    }

    const isSocialExceeded = psychTipoServicio === "social" && psychMontoTarifa > 15;
    const isApproved = isSocialExceeded ? false : true;

    if (isSocialExceeded) {
      alert("⚠️ Validación de Moderador: El costo ingresado excede el límite máximo permitido para ser considerado 'Tarifa Social' ($15 USD). El perfil ha sido creado/editado pero quedará inactivo y pendiente de aprobación por el administrador antes de ser visible públicamente.");
    }

    const payload: Omit<Psychologist, "id"> & { id?: string } = {
      nombre: psychNombre,
      titulo: psychEsInstitucion ? (psychTitulo || "Línea de Ayuda / Institución") : psychTitulo,
      especialidad: psychEspecialidad,
      descripcion: psychDescripcion,
      telefono: psychTelefono,
      whatsapp: psychWhatsapp,
      email: psychEmail,
      foto_url: psychFotoUrl,
      idiomas: psychIdiomas,
      modalidad: psychModalidad,
      booking_url: psychBookingUrl,
      es_institucion: psychEsInstitucion,
      activo: isApproved,
      tipo_servicio: psychEsInstitucion ? "gratuito" : psychTipoServicio,
      monto_tarifa: (!psychEsInstitucion && psychTipoServicio === "social") ? Number(psychMontoTarifa) : 0,
      moneda_tarifa: psychMonedaTarifa,
      verificado: psychVerificado,
    };

    if (editingPsych) {
      // Update
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("psychologists")
          .update(payload)
          .eq("id", editingPsych.id);
        if (error) {
          console.error("Error updating psychologist:", error);
          alert("Error al actualizar psicólogo: " + error.message);
          return;
        }
      }
      // Update local state
      setPsychologists(prev =>
        prev.map(p => (p.id === editingPsych.id ? { ...p, ...payload } : p))
      );
    } else {
      // Create
      const newId = isSupabaseConfigured && supabase ? undefined : crypto.randomUUID();
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("psychologists")
          .insert([payload])
          .select();
        if (error) {
          console.error("Error inserting psychologist:", error);
          alert("Error al guardar psicólogo: " + error.message);
          return;
        }
        if (data && data[0]) {
          setPsychologists(prev => [...prev, data[0]].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
      } else {
        const newPsych: Psychologist = { id: newId!, ...payload };
        const updatedList = [...psychologists, newPsych].sort((a, b) => a.nombre.localeCompare(b.nombre));
        setPsychologists(updatedList);
        localStorage.setItem("punto_de_apoyo_psychologists", JSON.stringify(updatedList));
      }
    }

    // Reset Form & Close
    handleClosePsychForm();
  };

  const handleToggleApprovePsych = async (p: Psychologist) => {
    const payload = { activo: true };
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("psychologists")
        .update(payload)
        .eq("id", p.id);
      if (error) {
        console.error("Error approving psychologist:", error);
        alert("Error al aprobar profesional: " + error.message);
        return;
      }
    }
    setPsychologists(prev =>
      prev.map(item => (item.id === p.id ? { ...item, activo: true } : item))
    );
    alert(`¡El perfil de ${p.nombre} ha sido aprobado y ya es público!`);
  };

  const handleDeletePsychologist = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este psicólogo/a o institución de la base de datos?")) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("psychologists").delete().eq("id", id);
      if (error) {
        console.error("Error deleting psychologist:", error);
        alert("Error al eliminar psicólogo/institución: " + error.message);
        return;
      }
    }

    const updatedList = psychologists.filter(p => p.id !== id);
    setPsychologists(updatedList);
    if (!isSupabaseConfigured || !supabase) {
      localStorage.setItem("punto_de_apoyo_psychologists", JSON.stringify(updatedList));
    }
  };

  const handleDismissAlert = (id: string) => {
    const updated = [...dismissedAlerts, id];
    setDismissedAlerts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("punto_de_apoyo_dismissed_alerts", JSON.stringify(updated));
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertText.trim()) return;
    const payload = {
      mensaje: newAlertText,
      tipo: newAlertTipo,
      activo: true
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("critical_alerts")
        .insert([payload])
        .select();
      if (error) {
        console.error("Error creating alert:", error);
        alert("Error al crear alerta: " + error.message);
        return;
      }
      if (data && data[0]) {
        setAlerts(prev => ({
          ...prev,
          manual: [data[0], ...prev.manual]
        }));
      }
    } else {
      const mockAlert = { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(), ...payload, creado_at: new Date().toISOString() };
      setAlerts(prev => ({
        ...prev,
        manual: [mockAlert, ...prev.manual]
      }));
    }
    setNewAlertText("");
    alert("¡Alerta crítica creada con éxito!");
  };

  const handleToggleDeactivateAlert = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("critical_alerts")
        .update({ activo: false })
        .eq("id", id);
      if (error) {
        console.error("Error deactivating alert:", error);
        alert("Error al desactivar alerta: " + error.message);
        return;
      }
    }
    setAlerts(prev => ({
      ...prev,
      manual: prev.manual.filter((a: any) => a.id !== id)
    }));
  };

  const handleStartEditPsych = (p: Psychologist) => {
    setEditingPsych(p);
    setPsychNombre(p.nombre || "");
    setPsychTitulo(p.titulo || "");
    setPsychEspecialidad(p.especialidad || "");
    setPsychDescripcion(p.descripcion || "");
    setPsychTelefono(p.telefono || "");
    setPsychWhatsapp(p.whatsapp || "");
    setPsychEmail(p.email || "");
    setPsychFotoUrl(p.foto_url || "");
    setPsychIdiomas(p.idiomas || "Español");
    setPsychModalidad(p.modalidad || "online");
    setPsychBookingUrl(p.booking_url || "");
    setPsychEsInstitucion(!!p.es_institucion);
    setPsychTipoServicio(p.tipo_servicio || "gratuito");
    setPsychMontoTarifa(p.monto_tarifa || 0);
    setPsychMonedaTarifa(p.moneda_tarifa || "USD");
    setPsychVerificado(p.verificado !== false);
    setIsPsychFormOpen(true);
  };

  const handleClosePsychForm = () => {
    setEditingPsych(null);
    setPsychNombre("");
    setPsychTitulo("");
    setPsychEspecialidad("");
    setPsychDescripcion("");
    setPsychTelefono("");
    setPsychWhatsapp("");
    setPsychEmail("");
    setPsychFotoUrl("");
    setPsychIdiomas("Español");
    setPsychModalidad("online");
    setPsychBookingUrl("");
    setPsychEsInstitucion(false);
    setPsychTipoServicio("gratuito");
    setPsychMontoTarifa(0);
    setPsychMonedaTarifa("USD");
    setPsychVerificado(true);
    setIsPsychFormOpen(false);
  };

  const handleSaveONUReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fallecidos: editOnuFallecidos,
      heridos: editOnuHeridos,
      desaparecidos: editOnuDesaparecidos,
      descripcion: editOnuDescripcion,
      respuesta: editOnuRespuesta,
      actualizado_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("onu_report")
        .update(payload)
        .eq("id", 1);
      if (error) {
        console.error("Error updating ONU report:", error);
        alert("Error al actualizar cifras ONU: " + error.message);
        return;
      }
    }

    setOnuFallecidos(editOnuFallecidos);
    setOnuHeridos(editOnuHeridos);
    setOnuDesaparecidos(editOnuDesaparecidos);
    setOnuDescripcion(editOnuDescripcion);
    setOnuRespuesta(editOnuRespuesta);
    setIsONUEditing(false);
    alert("¡Cifras del Reporte ONU actualizadas con éxito!");
  };

  const handleStartEditONU = () => {
    setEditOnuFallecidos(onuFallecidos);
    setEditOnuHeridos(onuHeridos);
    setEditOnuDesaparecidos(onuDesaparecidos);
    setEditOnuDescripcion(onuDescripcion);
    setEditOnuRespuesta(onuRespuesta);
    setIsONUEditing(true);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || "Colaborador",
            avatar: session.user.user_metadata?.avatar_url || "",
          });
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || "Colaborador",
            avatar: session.user.user_metadata?.avatar_url || "",
          });
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Dragging event listeners for mouse and touch movements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Bound position to screen boundaries
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.y));
      setPanelPos({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const newX = Math.max(0, Math.min(window.innerWidth - 320, touch.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragStart.y));
      setPanelPos({ x: newX, y: newY });
    };

    const handleStopDrag = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleStopDrag);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleStopDrag);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleStopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleStopDrag);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log("Geolocation error:", error)
      );
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsFiltersExpanded(false);
      setPanelPos({ x: 16, y: 140 });
    }
  }, []);

  const fetchReconectaPoints = async () => {
    try {
      const res = await fetch("/api/reconecta");
      if (!res.ok) throw new Error("API response not OK");
      const data = await res.json();
      if (data && data.sites) {
        // Convert Reconecta sites into PuntoReportado format
        const reconectaPuntos: PuntoReportado[] = data.sites.map((site: any) => ({
          id: `reconecta-${site.id}`,
          tipo: "ofrece",
          categoria: "senal",
          nombre: site.name,
          descripcion: `Punto de acceso satelital gratuito y libre de Reconecta Venezuela. Red WiFi: STARLINK. Estado: ${site.status.toUpperCase()}. Usuarios conectados: ${site.users ?? 0}. (⚠️ NOTA: Este es un punto satelital de acceso libre temporal. NO es una infraestructura fija permanente).`,
          direccion: site.address,
          lat: site.lat,
          lng: site.lng,
          confirmations: site.users || 0,
          creadoAt: data.updatedAt || new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
          aprobado: true,
          fuente: "Reconecta Venezuela",
          region: site.region,
        }));
        setReconectaSites(reconectaPuntos);
      }
    } catch (err) {
      console.error("Error fetching Reconecta Venezuela points:", err);
    }
  };

  useEffect(() => {
    fetchReconectaPoints();
    const interval = setInterval(fetchReconectaPoints, 30 * 60 * 1000); // Poll every 30 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      let dbPuntos: PuntoReportado[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("reports").select("*");
        if (data && !error) {
          dbPuntos = data;
        }
        // Load administrator list
        const { data: adminsData } = await supabase.from("admins").select("email");
        if (adminsData) {
          setAdmins(adminsData.map((a: any) => a.email.toLowerCase()));
        }

        // Load psychologist permissions list
        const { data: permData } = await supabase.from("psychologist_permissions").select("email");
        if (permData) {
          setAuthorizedPsychs(permData.map((p: any) => p.email.toLowerCase()));
        }

        // Fetch psychologists list
        const { data: psychs, error: psychErr } = await supabase
          .from("psychologists")
          .select("*")
          .order("nombre");
        if (psychs && !psychErr) {
          setPsychologists(psychs);
        }

        // Fetch ONU report statistics
        const { data: onuData } = await supabase
          .from("onu_report")
          .select("*")
          .eq("id", 1)
          .single();
        if (onuData) {
          setOnuFallecidos(onuData.fallecidos);
          setOnuHeridos(onuData.heridos);
          setOnuDesaparecidos(onuData.desaparecidos);
          setOnuDescripcion(onuData.descripcion);
          setOnuRespuesta(onuData.respuesta);
        }
      } else {
        const local = localStorage.getItem("punto_de_apoyo_puntos");
        if (local) {
          dbPuntos = JSON.parse(local).filter((p: any) => p.id !== "1" && p.id !== "2" && p.id !== "3");
          localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(dbPuntos));
        } else {
          dbPuntos = [];
        }

        const localPsychs = localStorage.getItem("punto_de_apoyo_psychologists");
        if (localPsychs) {
          setPsychologists(JSON.parse(localPsychs));
        }

        const localPerms = localStorage.getItem("punto_de_apoyo_authorized_psychs");
        if (localPerms) {
          setAuthorizedPsychs(JSON.parse(localPerms));
        }
      }

      try {
        const res = await fetch("/api/external-reports");
        const result = await res.json();
        if (result && result.success) {
          if (Array.isArray(result.data)) {
            setPuntos([...dbPuntos, ...result.data]);
          }
          if (Array.isArray(result.localizadosRaw)) {
            setLocalizados(result.localizadosRaw);
          }
        } else {
          setPuntos(dbPuntos);
        }
      } catch (err) {
        console.error("Error loading external reports:", err);
        setPuntos(dbPuntos);
      }

      // Fetch alerts
      try {
        const resAlerts = await fetch("/api/alerts");
        const alertsData = await resAlerts.json();
        if (alertsData) {
          setAlerts({
            manual: Array.isArray(alertsData.manual) ? alertsData.manual : [],
            seismic: Array.isArray(alertsData.seismic) ? alertsData.seismic : []
          });
        }
      } catch (err) {
        console.error("Error loading alerts:", err);
      }

      // Load dismissed alerts from localStorage
      if (typeof window !== "undefined") {
        const dismissed = localStorage.getItem("punto_de_apoyo_dismissed_alerts");
        if (dismissed) {
          setDismissedAlerts(JSON.parse(dismissed));
        }
      }
    };
    loadData();
  }, []);

  // Auto-dismiss seismic/sismo alert notifications after 8 seconds
  useEffect(() => {
    const allAlerts = [
      ...(alerts.manual || []),
      ...(alerts.seismic || [])
    ];
    const timers: NodeJS.Timeout[] = [];

    allAlerts.forEach((alert) => {
      if (alert.tipo === 'sismo' && !dismissedAlerts.includes(alert.id)) {
        const t = setTimeout(() => {
          setDismissedAlerts((prev) => {
            if (prev.includes(alert.id)) return prev;
            const updated = [...prev, alert.id];
            localStorage.setItem("punto_de_apoyo_dismissed_alerts", JSON.stringify(updated));
            return updated;
          });
        }, 8000); // 8 seconds
        timers.push(t);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [alerts, dismissedAlerts]);

  // Supabase Real-time updates subscription for points
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel("reports-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPoint = payload.new as PuntoReportado;
            setPuntos((prev) => {
              if (prev.some((p) => p.id === newPoint.id)) return prev;
              return [newPoint, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedPoint = payload.new as PuntoReportado;
            setPuntos((prev) =>
              prev.map((p) =>
                p.id === updatedPoint.id
                  ? { ...p, ...updatedPoint }
                  : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedPoint = payload.old as { id: string };
            setPuntos((prev) => prev.filter((p) => p.id !== deletedPoint.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isSupabaseConfigured, supabase]);

  // Real-time search query listener for Desaparecidos/Localizados
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      try {
        const url = desaparecidosQuery.trim()
          ? `/api/external-reports?q=${encodeURIComponent(desaparecidosQuery)}`
          : "/api/external-reports";
        const res = await fetch(url);
        const result = await res.json();
        if (result && result.success && Array.isArray(result.localizadosRaw)) {
          setLocalizados(result.localizadosRaw);
        }
      } catch (err) {
        console.error("Error searching localizados in real-time:", err);
      }
    }, 450); // 450ms debounce to prevent API flooding

    return () => clearTimeout(delayDebounceFn);
  }, [desaparecidosQuery]);

  useEffect(() => {
    const getAddress = async () => {
      if (!selectedCoords) return;
      setIsReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}`
        );
        const data = await res.json();
        if (data && data.display_name) {
          setFormDireccion(data.display_name);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsReverseGeocoding(false);
      }
    };
    getAddress();
  }, [selectedCoords]);

  // Ctrl+Z undo for admin marker moves
  useEffect(() => {
    if (!isAdmin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only fire when not typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndoMove();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, moveHistory]);

  const handleLocationSelected = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    setFormCategoria(isOwner ? "suministros" : "peligro");
  };

  const handleConfirm = async (id: string) => {
    const updated = puntos.map((p) => {
      if (p.id === id) {
        return { ...p, confirmations: p.confirmations + 1 };
      }
      return p;
    });
    setPuntos(updated);
    localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("reports")
        .update({ confirmations: updated.find((p) => p.id === id)?.confirmations })
        .eq("id", id);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoords) return;

    const ttlHours = formTipo === "necesita" ? 24 : 72;
    const creadoAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();

    const randomId = Math.random().toString(36).substr(2, 9);
    const creatorSuffix = user ? `-creator-${user.email.toLowerCase()}` : "-creator-anonymous";
    const nuevoPunto: PuntoReportado = {
      id: `${randomId}${creatorSuffix}`,
      tipo: formTipo,
      categoria: formCategoria,
      descripcion: formDescripcion || `Reporte de ${formCategoria}`,
      direccion: formDireccion || undefined,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      confirmations: 0,
      creadoAt,
      expiresAt,
      // Pending review if anonymous, auto-approved if logged in admin/user
      aprobado: user !== null,
      creadorAnonimo: user === null,
    };

    const updated = [nuevoPunto, ...puntos];
    setPuntos(updated);
    localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("reports").insert([nuevoPunto]);
      if (error) {
        console.error("Error inserting report in Supabase:", error);
      }
    }

    // Trigger immediate Discord Notification for anonymous review
    const discordWebhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl && user === null) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat},${selectedCoords.lng}`;
      fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🚨 Nuevo Reporte Anónimo Pendiente de Revisión",
            description: `Un usuario anónimo ha reportado un nuevo punto. Requiere aprobación del administrador para ser visible públicamente.`,
            color: 16753920, // Orange
            fields: [
              { name: "Categoría", value: formCategoria.toUpperCase(), inline: true },
              { name: "Tipo", value: formTipo === "ofrece" ? "Ofrece ayuda" : "Necesita ayuda", inline: true },
              { name: "Dirección", value: formDireccion || "No geolocalizada" },
              { name: "Descripción", value: formDescripcion || "Sin notas adicionales" },
              { name: "Mapa", value: `[Ver Ubicación en Google Maps](${mapsUrl})` }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error("Error sending Discord webhook alert:", err));
    }

    if (user === null) {
      alert("Tu reporte ha sido enviado. Solo el administrador podrá verlo para revisión antes de publicarlo en el mapa.");
    }

    setIsReporting(false);
    setSelectedCoords(null);
    setFormDescripcion("");
    setFormDireccion("");
  };

  const seismicMapPuntos: PuntoReportado[] = (alerts.seismic || []).map((s) => ({
    id: s.id,
    tipo: "ofrece" as const,
    categoria: "sismo" as const,
    descripcion: s.mensaje,
    lat: s.lat,
    lng: s.lng,
    confirmations: 0,
    creadoAt: s.creado_at,
    expiresAt: s.creado_at,
    nombre: `Sismo Magnitud ${s.mag}`,
    direccion: s.place,
    fuente: "USGS / FUNVISIS",
    aprobado: true
  }));

  const filteredPuntos = [...puntos, ...reconectaSites, ...seismicMapPuntos].filter((punto) => {
    // Exclude news/noticias from map rendering
    if (punto.tipo === "noticia") return false;

    // Hide unapproved points from regular users (only admins can see them)
    if (punto.aprobado === false && !isAdmin) {
      return false;
    }

    // Main category filter (pill buttons)
    if (activeMainFilter) {
      const desc = (punto.descripcion || "").toLowerCase() + " " + (punto.nombre || "").toLowerCase() + " " + (punto.aceptan || "").toLowerCase() + " " + (punto.categoria || "").toLowerCase();
      const fuente = (punto.fuente || "").toLowerCase();

      switch (activeMainFilter) {
        case "hospital":
          // Hospitals and health centers
          if (punto.categoria !== "salud") return false;
          break;
        case "acopio":
          // Collection centers: suministros category OR contains acopio keywords
          if (punto.categoria !== "suministros" && !desc.includes("acopio") && !desc.includes("centro de recolec") && !desc.includes("mrw") && !fuente.includes("ayuda por venezuela")) return false;
          break;
        case "emergencia":
          // Active emergency reports: peligro category OR rescue/emergency keywords
          if (punto.categoria !== "peligro" && !desc.includes("rescate") && !desc.includes("derrumbe") && !desc.includes("inundaci") && !desc.includes("emergencia") && !desc.includes("peligro")) return false;
          break;
        case "vehiculos":
          // Vehicles / heavy machinery / supply trucks
          if (punto.categoria !== "movilidad" && !desc.includes("camion") && !desc.includes("vehiculo") && !desc.includes("maquinaria") && !desc.includes("transporte") && !desc.includes("carga")) return false;
          break;
        case "wifi":
          // WiFi/internet access points
          if (punto.categoria !== "senal" && !desc.includes("wifi") && !desc.includes("internet") && !desc.includes("señal") && !desc.includes("conect") && !fuente.includes("openstreetmap")) return false;
          break;
      }
    } else {
      // Standard dropdown filters when no main filter active
      if (tipoFilter !== "todos" && punto.tipo !== tipoFilter) {
        return false;
      }
      if (categoriaFilter !== "todos" && punto.categoria !== categoriaFilter) {
        return false;
      }
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      if (
        !punto.descripcion.toLowerCase().includes(q) && 
        !punto.categoria.toLowerCase().includes(q) &&
        !(punto.nombre && punto.nombre.toLowerCase().includes(q))
      ) {
        return false;
      }
    }

    if (cercaDeMi && userLocation) {
      const dist = getDistance(userLocation[0], userLocation[1], punto.lat, punto.lng);
      if (dist > 5) return false;
    }
    return true;
  });

  // Filter psychologists based on active tab and search query
  const filteredPsychs = psychologists
    .filter(p => {
      // Ocultar psicólogos inactivos a menos que sea administrador
      if (p.activo === false && !isAdmin) return false;
      
      // Filtro de pestaña (gratuito vs social vs lineas)
      if (psychActiveTab === "gratuito") {
        return !p.es_institucion && (!p.tipo_servicio || p.tipo_servicio === "gratuito");
      }
      if (psychActiveTab === "social") {
        return !p.es_institucion && p.tipo_servicio === "social";
      }
      if (psychActiveTab === "lineas") {
        return p.es_institucion === true;
      }
      return true;
    })
    .filter((p) => {
      const query = searchPsych.toLowerCase().trim();
      if (!query) return true;
      return (
        p.nombre.toLowerCase().includes(query) ||
        p.especialidad.toLowerCase().includes(query) ||
        (p.titulo && p.titulo.toLowerCase().includes(query)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query))
      );
    });

  const activeAlertsToShow = [
    ...(alerts.manual || []),
    ...(alerts.seismic || [])
  ].filter((a) => !dismissedAlerts.includes(a.id));

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col">
      {/* 1. Header Fijo Superior (Floating on Map, full screen friendly) */}
      <header className="absolute top-0 left-0 right-0 z-30 p-2 sm:p-4 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col gap-2 p-2 sm:p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl pointer-events-auto sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {/* Row 1: Logo & Title + Mobile Auth Widget */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-1.5 sm:p-2 rounded-xl shadow-lg shadow-orange-500/20 shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xs sm:text-base font-black text-white leading-tight">Punto de Apoyo</h1>
                <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">
                  Crisis & Apoyo
                </span>
              </div>
            </div>

            {/* Mobile-only Authentication Widget */}
            <div className="flex sm:hidden items-center gap-1.5 border-l border-slate-800/80 pl-2 shrink-0">
              {user ? (
                <div className="flex items-center gap-1.5 bg-slate-950/60 p-0.5 pl-1.5 pr-1.5 rounded-lg border border-slate-850">
                  {user.avatar && (
                    <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full border border-orange-500/80" />
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="flex items-center gap-0.5 text-[8px] font-extrabold text-orange-400 hover:text-orange-300 uppercase tracking-wider cursor-pointer"
                    >
                      <Settings className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-[8px] font-extrabold text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[9px] font-bold transition cursor-pointer"
                >
                  🔑 Google
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Nav Tabs + Desktop Auth Widget */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800/60 w-full sm:w-auto sm:min-w-[280px]">
              <button
                onClick={() => {
                  setCurrentTab("mapa");
                  setIsReporting(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentTab === "mapa" ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Mapa
              </button>
              <button
                onClick={() => {
                  setCurrentTab("sheets");
                  setIsReporting(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentTab === "sheets" ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Desaparecidos
              </button>
            </div>

            {/* Desktop-only Authentication Widget */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 bg-slate-950/60 p-1 pl-2.5 pr-2.5 rounded-xl border border-slate-800/80">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full border border-orange-500" />
                  ) : (
                    <span className="text-[10px] text-slate-300">👤</span>
                  )}
                  <span className="text-[10px] font-bold text-slate-200">{user.name.split(" ")[0]}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="flex items-center gap-0.5 text-[9px] font-extrabold text-orange-400 hover:text-orange-300 uppercase tracking-wider ml-1 cursor-pointer"
                      title="Panel de Administración (Alertas y Privilegios)"
                    >
                      <Settings className="w-2.5 h-2.5" /> Panel Admin
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-[9px] font-extrabold text-red-400 hover:text-red-300 uppercase tracking-wider ml-1 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <span>🔑</span>
                  <span>Google Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 1.1. Banners de Alertas Críticas (Tiempo Real Seismológico/Administrador) */}
      {activeAlertsToShow.length > 0 && (
        <div className="absolute top-[72px] sm:top-[88px] left-4 right-4 z-40 max-w-5xl mx-auto flex flex-col gap-2 pointer-events-auto">
          {activeAlertsToShow.slice(0, 3).map((alert: any) => (
            <div
              key={alert.id}
              onClick={() => {
                if (alert.lat && alert.lng) {
                  setMapViewControllerTrigger({
                    center: [parseFloat(alert.lat), parseFloat(alert.lng)],
                    zoom: 12,
                    timestamp: Date.now()
                  });
                }
              }}
              className={`relative px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-lg backdrop-blur-md transition-all duration-300 ${
                alert.lat && alert.lng ? 'cursor-pointer hover:border-slate-500 hover:scale-[1.01]' : ''
              } ${
                alert.tipo === 'critico'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                  : alert.tipo === 'sismo'
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-250 border-amber-550/30'
                  : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
              }`}
            >
              <div className="flex items-center gap-2 text-[10px] font-bold leading-snug">
                <span className="text-xs shrink-0">
                  {alert.tipo === 'critico' ? '⚠️' : alert.tipo === 'sismo' ? '💥' : '🇺🇳'}
                </span>
                <span>{alert.mensaje}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismissAlert(alert.id);
                }}
                className="text-[10px] font-extrabold hover:text-white text-slate-400 p-1 cursor-pointer transition shrink-0 z-10"
                title="Descartar alerta"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. Content Area */}
      <div className="flex-1 w-full h-full relative">
        {currentTab === "mapa" ? (
          <>
            {/* The Map occupies the ENTIRE viewport behind floating UI elements */}
            <div className="absolute inset-0 w-full h-full z-10">
              <MapaColaborativo
                puntos={filteredPuntos}
                isReportingMode={isReporting}
                onLocationSelected={handleLocationSelected}
                onConfirm={handleConfirm}
                onEdit={handleStartEdit}
                userLocation={userLocation}
                isAdmin={isAdmin}
                isOwner={isOwner}
                isCeo={isCeo}
                isCenterAdmin={isCenterAdmin}
                onApprove={handleApprovePunto}
                onDelete={handleDeletePunto}
                onMarkerMove={handleMarkerMove}
                onViewSupplies={handleOpenSupplies}
                mapViewControllerTrigger={mapViewControllerTrigger}
              />
            </div>

            {/* 3. Top Filter Pills  —  premium, horizontal, scrollable */}
            <div className="absolute top-[106px] sm:top-[96px] left-0 right-0 z-20 pointer-events-none">
            
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5 pointer-events-auto px-2 sm:px-4">
                {/* ALL button */}
                <button
                  onClick={() => setActiveMainFilter(null)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border font-bold text-[10px] transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer ${
                    activeMainFilter === null
                      ? "bg-white text-slate-900 border-white shadow-white/20 ring-2 ring-white/40"
                      : "bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  }`}
                >
                  <span className="text-sm">🌍</span>
                  <span>Todo</span>
                </button>

                {MAIN_FILTERS.map((f) => {
                  const isActive = activeMainFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveMainFilter(isActive ? null : f.id)}
                      title={f.description}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full border font-bold text-[10px] transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer ${
                        isActive
                          ? `bg-gradient-to-r ${f.color} ${f.border} ${f.textActive} shadow-lg ${f.glow} ring-2 ${f.ring}`
                          : `bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200`
                      }`}
                    >
                      <span className="text-sm">{f.emoji}</span>
                      <span className="whitespace-nowrap">{f.shortName}</span>
                      {isActive && (
                        <span className="ml-1 w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Active filter description chip */}
                {activeMainFilter && (() => {
                  const f = MAIN_FILTERS.find(f => f.id === activeMainFilter);
                  if (!f) return null;
                  return (
                    <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${f.bg} border ${f.border} text-slate-300 text-[10px] font-medium max-w-[200px] truncate`}>
                      <span className="text-[10px] italic truncate">{f.description}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 4. Floating Filters Card (Draggable on Desktop, Fixed Bottom-Sheet Drawer on Mobile) */}
            <div 
              style={typeof window !== "undefined" && window.innerWidth >= 640 ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` } : {}}
              className="fixed bottom-0 left-0 right-0 w-full sm:absolute sm:bottom-auto sm:left-auto sm:right-auto sm:w-[300px] z-20 pointer-events-auto select-none"
            >
              <div className="w-full bg-slate-900/95 backdrop-blur-md border-t sm:border border-slate-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col gap-2 sm:gap-3 max-h-[40dvh] sm:max-h-[60dvh] overflow-hidden transition-all duration-300">
                
                {/* Header Drag Handle & Title (Acts as grab handle) */}
                <div 
                  onMouseDown={(e) => {
                    if (typeof window !== "undefined" && window.innerWidth < 640) return;
                    if (e.button !== 0) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("button")) return;
                    setIsDragging(true);
                    setDragStart({
                      x: e.clientX - panelPos.x,
                      y: e.clientY - panelPos.y
                    });
                  }}
                  onTouchStart={(e) => {
                    if (typeof window !== "undefined" && window.innerWidth < 640) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("button")) return;
                    const touch = e.touches[0];
                    setIsDragging(true);
                    setDragStart({
                      x: touch.clientX - panelPos.x,
                      y: touch.clientY - panelPos.y
                    });
                  }}
                  style={{ cursor: typeof window !== "undefined" && window.innerWidth >= 640 ? (isDragging ? "grabbing" : "grab") : "default" }}
                  className="px-4 pt-2 pb-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-col gap-1 select-none"
                >
                  {/* Visual Pill Drag Indicator */}
                  <div className="w-10 h-1 bg-slate-700/60 rounded-full mx-auto" />
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer select-none"
                    >
                      <ListFilter className="w-3.5 h-3.5 text-orange-500" />
                      Filtros Rápidos
                      {isFiltersExpanded ? <ChevronUp className="w-3 h-3 text-orange-500" /> : <ChevronDown className="w-3 h-3 text-orange-500" />}
                    </button>
                    {userLocation && (
                      <button
                        onClick={() => setCercaDeMi(!cercaDeMi)}
                        className={`text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full transition-all border cursor-pointer ${
                          cercaDeMi
                            ? "bg-orange-500/15 border-orange-500 text-orange-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Cerca de mí
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible search and detailed filters */}
                {isFiltersExpanded && (
                  <div className="p-2.5 pt-0.5 flex flex-col gap-2.5 overflow-y-auto max-h-[34dvh] scrollbar-none">
                    
                    {/* Stats Comparison Card */}
                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col gap-2 shadow-inner">
                      <div className="text-[7.5px] font-black uppercase tracking-widest text-orange-500">
                        📊 Comparación de Monitoreo Nacional
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/50">
                          <span className="text-[6.5px] text-slate-400 font-extrabold uppercase block truncate">En el Mapa</span>
                          <strong className="text-xs font-black text-sky-400">
                            {puntos.filter(p => p.fuente !== "Localizados VE").length}
                          </strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Centros activos</span>
                        </div>
                        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/50">
                          <span className="text-[6.5px] text-slate-400 font-extrabold uppercase block truncate">Ayuda por Vzla</span>
                          <strong className="text-xs font-black text-amber-500">403</strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Centros registrados</span>
                        </div>
                        <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/50">
                          <span className="text-[6.5px] text-slate-400 font-extrabold uppercase block truncate">Localizados</span>
                          <strong className="text-xs font-black text-rose-500">500</strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Personas encontradas</span>
                        </div>
                      </div>
                      
                      <p className="text-[7.2px] text-slate-400 leading-snug">
                        Nuestra app filtra y agrupa reportes del terremoto 2026. Mostramos <strong className="text-sky-400">{puntos.filter(p => p.fuente !== "Localizados VE").length} centros funcionales</strong> mapeados, de los <strong className="text-amber-500">403 centros oficiales</strong> reportados en <a href="https://ayudaparavenezuela.com/#centros" target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300">ayudaparavenezuela.com</a>.
                      </p>
                    </div>

                    {/* Filtro por Categorías */}
                    <div className="flex flex-col gap-2 bg-slate-950 border border-slate-800/80 rounded-xl p-2 shadow-inner">
                      <div className="text-[7.5px] font-black uppercase tracking-widest text-orange-500">
                        🔍 Filtrar por Categoría en Mapa
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("todos")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "todos"
                              ? "bg-orange-500 text-white shadow-md border border-orange-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          🌍 Mostrar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("energia")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "energia"
                              ? "bg-amber-500 text-white shadow-md border border-amber-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          ⚡ Energía / Carga
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("suministros")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "suministros"
                              ? "bg-sky-500 text-white shadow-md border border-sky-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          📦 Centros de Acopio
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("salud")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "salud"
                              ? "bg-emerald-500 text-white shadow-md border border-emerald-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          🏥 Salud y Hospitales
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("senal")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "senal"
                              ? "bg-indigo-500 text-white shadow-md border border-indigo-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          🌐 Internet / WiFi
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("movilidad")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "movilidad"
                              ? "bg-purple-500 text-white shadow-md border border-purple-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          🚛 Vehículos / Movilidad
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("peligro")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "peligro"
                              ? "bg-rose-500 text-white shadow-md border border-rose-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          ⚠️ Peligros Civiles
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaFilter("sismo")}
                          className={`py-1 px-1.5 rounded-lg text-[8.2px] font-extrabold transition cursor-pointer text-left flex items-center gap-1 ${
                            categoriaFilter === "sismo"
                              ? "bg-red-650 text-white shadow-md border border-red-550"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-red-950/20"
                          }`}
                        >
                          💥 Reportes de Sismos
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Bottom Float Action Buttons (Stacked Vertically, positioned above Filters Card on Mobile) */}
            <div 
              style={
                typeof window !== "undefined" && window.innerWidth < 640
                  ? { bottom: isFiltersExpanded ? "50dvh" : "76px" }
                  : { bottom: "24px" }
              }
              className="fixed right-4 z-20 pointer-events-none flex flex-col items-end gap-2.5 sm:absolute sm:right-6 transition-all duration-300"
            >
              
              {isReporting && !selectedCoords && (
                <div className="p-4 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-2xl flex items-start gap-3 shadow-2xl animate-bounce pointer-events-auto sm:max-w-[320px]">
                  <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500 shrink-0">
                    <MapPin className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                      Ubicar en Mapa
                    </h4>
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      Toca cualquier punto en el mapa de fondo para registrar coordenadas.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Floating Report Button (Round Circle matching others) */}
              <button
                onClick={() => {
                  setIsReporting(!isReporting);
                  setSelectedCoords(null);
                }}
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end ${
                  isReporting
                    ? "bg-rose-955/95 border border-rose-500/40 text-rose-200 shadow-rose-600/10 animate-pulse"
                    : "bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-emerald-400 hover:text-emerald-350 shadow-emerald-500/10"
                }`}
                title={isReporting ? "Cancelar Reporte" : "Reportar Punto"}
              >
                {isReporting ? "✕" : "➕"}
              </button>

              {/* Psychological Support Button */}
              <button
                onClick={() => setIsPsychOpen(true)}
                className="w-11 h-11 rounded-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-purple-400 hover:text-purple-350 flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end"
                title="Directorio de Apoyo Psicológico"
              >
                🧠
              </button>

              {/* ONU Report Button */}
              <button
                onClick={() => setIsONUReportOpen(true)}
                className="w-11 h-11 rounded-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-orange-400 hover:text-orange-350 flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end"
                title="Cifras del Reporte de Impacto ONU"
              >
                🇺🇳
              </button>

              {/* Últimas Noticias Button */}
              <button
                onClick={() => setIsNewsOpen(true)}
                className="relative w-11 h-11 rounded-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-sky-400 hover:text-sky-350 flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end"
                title="Últimas Noticias Oficiales"
              >
                📢
                {puntos.filter((p) => p.tipo === "noticia").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-lg shadow-sky-500/30 animate-pulse">
                    {puntos.filter((p) => p.tipo === "noticia").length}
                  </span>
                )}
              </button>

              {/* Seismic Bulletin Button */}
              <button
                onClick={() => setIsSeismicOpen(true)}
                className="relative w-11 h-11 rounded-full bg-slate-900/90 border border-slate-800 hover:border-rose-700/60 text-rose-400 hover:text-rose-300 flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end"
                title="Boletín Sísmico (FUNVISIS / USGS)"
              >
                💥
                {alerts.seismic && alerts.seismic.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-lg shadow-rose-500/30 animate-pulse">
                    {alerts.seismic.length}
                  </span>
                )}
              </button>

              {/* Credits & Help Button (?) */}
              <button
                onClick={() => setIsCreditsOpen(true)}
                className="w-11 h-11 rounded-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-base shadow-2xl transition-all duration-300 transform hover:scale-110 pointer-events-auto cursor-pointer self-end"
                title="Créditos e Información de Fuentes"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* 5. Bottom Form Drawer (Floating Bottom Card when point clicked) */}
            {isReporting && selectedCoords && (
              <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-orange-500" />
                  Detalles del Reporte
                </h3>

                <form onSubmit={handleSubmitReport} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Tipo de Reporte
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormTipo("ofrece")}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition border ${
                          formTipo === "ofrece"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Ofrezco / Tengo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormTipo("necesita")}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition border ${
                          formTipo === "necesita"
                            ? "bg-rose-500/20 border-rose-500 text-rose-400"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Necesito / Solicito
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Categoría
                    </label>
                    <select
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value as PuntoReportado["categoria"])}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-orange-500/50 transition"
                    >
                      {/* Publicly reportable categories: Danger (peligro) or Mobility/Vehicles (movilidad) */}
                      <option value="peligro">⚠️ Peligro / Zonas Afectadas</option>
                      <option value="movilidad">🚛 Movilidad / Transporte (Vehículos)</option>

                      {/* ONLY Owner/Admin can report: WiFi (senal), Suministros/Acopio (suministros), Energía (energia), Salud (salud) */}
                      {isOwner && (
                        <>
                          <option value="senal">🌐 Señal / Conectividad (WiFi)</option>
                          <option value="suministros">📦 Suministros / Agua / Alimentos (Acopio)</option>
                          <option value="energia">⚡ Energía / Electricidad</option>
                          <option value="salud">🏥 Salud / Primeros Auxilios</option>
                          <option value="sismo">💥 Alerta Sismológica</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Descripción de la situación
                    </label>
                    <textarea
                      required
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      placeholder="Detalles sobre la ayuda o necesidad..."
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-orange-500/50 transition h-14 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Dirección aproximada (Geolocalizada)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={isReverseGeocoding ? "Buscando dirección..." : formDireccion}
                      className="w-full px-2 py-1 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 text-[10px] focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCoords(null)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition cursor-pointer"
                    >
                      Re-ubicar pin
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[11px] font-bold transition cursor-pointer"
                    >
                      Publicar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          // 6. Google Sheets Panel (Fills the entire screen under the header)
          <div className="absolute inset-0 pt-28 pb-6 px-4 max-w-5xl mx-auto h-full overflow-y-auto flex flex-col gap-6 z-20 bg-slate-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Listado de Personas Localizadas
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Datos consolidados en tiempo real del portal oficial de emergencias.
                </p>
              </div>

              {/* Local Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={desaparecidosQuery}
                  onChange={(e) => setDesaparecidosQuery(e.target.value)}
                  placeholder="Buscar por nombre, hospital, ciudad..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Google Sheets Table */}
            <div className="w-full overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-xl flex-1 min-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-300 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3.5">Nombre Completo</th>
                    <th className="p-3.5">Edad</th>
                    <th className="p-3.5">Estado / Condición</th>
                    <th className="p-3.5">Ubicación / Centro</th>
                    <th className="p-3.5">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 text-[11px]">
                  {localizados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Cargando base de datos de localizados...
                      </td>
                    </tr>
                  ) : localizados.filter((p) => {
                      if (!desaparecidosQuery.trim()) return true;
                      const q = desaparecidosQuery.toLowerCase();
                      return (
                        p.nombreCompleto?.toLowerCase().includes(q) ||
                        p.lugarNombre?.toLowerCase().includes(q) ||
                        p.direccion?.toLowerCase().includes(q) ||
                        p.observaciones?.toLowerCase().includes(q) ||
                        (p.cedula && String(p.cedula).toLowerCase().includes(q)) ||
                        (p.edad && String(p.edad).toLowerCase().includes(q)) ||
                        p.lugarSlug?.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No se encontraron resultados para "{desaparecidosQuery}".
                      </td>
                    </tr>
                  ) : (
                    localizados
                      .filter((p) => {
                        if (!desaparecidosQuery.trim()) return true;
                        const q = desaparecidosQuery.toLowerCase();
                        return (
                          p.nombreCompleto?.toLowerCase().includes(q) ||
                          p.lugarNombre?.toLowerCase().includes(q) ||
                          p.direccion?.toLowerCase().includes(q) ||
                          p.observaciones?.toLowerCase().includes(q) ||
                          (p.cedula && String(p.cedula).toLowerCase().includes(q)) ||
                          (p.edad && String(p.edad).toLowerCase().includes(q)) ||
                          p.lugarSlug?.toLowerCase().includes(q)
                        );
                      })
                      .map((person, index) => {
                        const cond = person.condicion || "desconocido";
                        const stateText = cond === "vivo" ? "Localizado - Vivo" : cond === "fallecido" ? "Fallecido" : "En Observación";
                        const badgeColor = cond === "vivo" ? "bg-emerald-500/10 text-emerald-400" : cond === "fallecido" ? "bg-rose-500/10 text-rose-400" : "bg-sky-500/10 text-sky-400";
                        return (
                          <tr key={person.slug || index} className="hover:bg-slate-900/30 transition border-b border-slate-800/30">
                            <td className="p-3.5 text-white">
                              <div className="font-bold text-white">{person.nombreCompleto}</div>
                              {person.cedula && (
                                <div className="text-[9px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wider">
                                  💳 C.I.: {person.cedula}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-400 font-bold">{person.edad ? `${person.edad} años` : "S/I"}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${badgeColor}`}>
                                {stateText}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-350">
                              <div className="font-bold text-slate-200">{person.lugarNombre || "Sin Centro"}</div>
                              {person.direccion && <div className="text-[10px] text-slate-500 mt-0.5">{person.direccion}</div>}
                              {person.telefono && (
                                <div className="text-[9px] text-orange-400/80 font-bold mt-1">
                                  📞 Tel: {person.telefono}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-400 max-w-sm whitespace-pre-wrap break-words">
                              {person.observaciones || "Sin observaciones registradas."}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Public Link Card */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shrink-0">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-300">
                    Fuente de datos oficial: Localizados Venezuela
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Puedes consultar, reportar nuevos casos y ver el portal maestro en su web oficial.
                  </p>
                </div>
              </div>
              <a
                href="https://localizadosvenezuela.com/"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-bold transition border border-slate-700 text-center"
              >
                Visitar LocalizadosVenezuela.com
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modern Blur Modal for Editing Center Items / Percentages */}
      {editingPunto && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest">
                  ✏️ Actualizar Insumos
                </h2>
                <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                  {editingPunto.nombre || "Reporte de Emergencia"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPunto(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar (✕)
              </button>
            </div>

            {/* Basic Info Fields */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Nombre del Centro
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Dirección Detallada
                </label>
                <textarea
                  value={editDireccion}
                  onChange={(e) => setEditDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50 h-16 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={editContacto}
                    onChange={(e) => setEditContacto(e.target.value)}
                    placeholder="Ej. 04141234567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    ¿Qué Aceptan / Ofrecen?
                  </label>
                  <input
                    type="text"
                    value={editAceptan}
                    onChange={(e) => setEditAceptan(e.target.value)}
                    placeholder="Ej. Agua, Comida, Ropa"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Notas / Detalles del Centro
                </label>
                <textarea
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  placeholder="Observaciones de capacidad, estado de luz, etc."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50 h-16 resize-none"
                />
              </div>

              {/* Coordenadas de Ubicación (Sólo Dueño/Admin) */}
              {isOwner && (
                <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-850">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Latitud (Coordenada)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editLat}
                      onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Longitud (Coordenada)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editLng}
                      onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resource Details inside popup - no longer shown as sliders here */}

            {/* Save Buttons */}
            <div className="flex gap-3 border-t border-slate-800 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setEditingPunto(null)}
                className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 12. Supply Periodic Table Modal */}
      {isSuppliesOpen && activeSuppliesPunto && (() => {
        const isAuthorizedToEditSupplies = !!(user && (
          isAdmin || 
          activeSuppliesPunto.id.includes("-creator-" + user.email.toLowerCase())
        ));

        const filteredSuppliesList = PERIODIC_SUPPLIES.filter((elem) => {
          if (selectedSupplyCategory !== "todos" && elem.category !== selectedSupplyCategory) {
            return false;
          }
          if (supplySearchQuery) {
            const q = supplySearchQuery.toLowerCase();
            return (
              elem.name.toLowerCase().includes(q) ||
              elem.symbol.toLowerCase().includes(q) ||
              elem.description.toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-in scale-in-95 duration-200 max-h-[96dvh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Inventario de Insumos & Servicios
                    </h3>
                  </div>
                  <span className="text-[10px] text-orange-500 font-bold tracking-wide mt-0.5">
                    {activeSuppliesPunto.nombre || "Centro de Ayuda / Hospital"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsSuppliesOpen(false);
                    setActiveSuppliesPunto(null);
                  }}
                  className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warning for Read-only Mode */}
              {!isAuthorizedToEditSupplies && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-450 rounded-xl px-2.5 py-1.5 text-[8.5px] font-bold flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Modo Lectura: Solo los administradores y dueños del centro pueden registrar o cambiar el inventario.</span>
                </div>
              )}

              {/* Search Bar & Category Filter Pills */}
              <div className="flex flex-col gap-2 bg-slate-950/40 p-2 rounded-2xl border border-slate-850/60">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 text-[10px]">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar insumo por nombre o símbolo..."
                    value={supplySearchQuery}
                    onChange={(e) => setSupplySearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1 pl-7 pr-3 text-[9.5px] text-white focus:outline-none focus:border-orange-500/50 transition font-medium"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mr-1">Sectores:</span>
                  {[
                    { id: "todos", label: "Todos", color: "border-slate-800 text-slate-400" },
                    { id: "alimentos", label: "Alimentos", color: "border-amber-500/30 text-amber-400 bg-amber-500/5" },
                    { id: "servicios", label: "Servicios", color: "border-sky-500/30 text-sky-400 bg-sky-500/5" },
                    { id: "ropa", label: "Ropa", color: "border-purple-500/30 text-purple-400 bg-purple-500/5" },
                    { id: "higiene", label: "Higiene", color: "border-teal-500/30 text-teal-400 bg-teal-500/5" },
                    { id: "salud", label: "Salud", color: "border-rose-500/30 text-rose-400 bg-rose-500/5" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSupplyCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-lg text-[8px] font-extrabold uppercase transition border cursor-pointer ${
                        selectedSupplyCategory === cat.id
                          ? "bg-gradient-to-r from-orange-600 to-amber-500 border-transparent text-white shadow-sm"
                          : `${cat.color} hover:border-slate-400`
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Periodic Table Grid wrapper */}
              <div className="flex-1 py-1.5 flex justify-center items-center overflow-visible">
                <div className="grid grid-cols-12 gap-0.5 sm:gap-1 w-full max-w-[500px] aspect-[12/4] mx-auto">
                  {PERIODIC_SUPPLIES.map((elem) => {
                    const isAvailable = supplyStates[elem.symbol] !== false;
                    
                    // Filter match
                    const matchesSearch = !supplySearchQuery || (
                      elem.name.toLowerCase().includes(supplySearchQuery.toLowerCase()) ||
                      elem.symbol.toLowerCase().includes(supplySearchQuery.toLowerCase()) ||
                      elem.description.toLowerCase().includes(supplySearchQuery.toLowerCase())
                    );
                    const matchesCategory = selectedSupplyCategory === "todos" || elem.category === selectedSupplyCategory;
                    const isDimmed = !matchesSearch || !matchesCategory;

                    // Category Styling
                    let catColor = "";
                    if (elem.category === "alimentos") {
                      catColor = isAvailable 
                        ? "bg-amber-950/65 border-amber-600/70 text-amber-200 shadow-lg shadow-amber-500/5"
                        : "bg-slate-950/40 border-slate-850 text-slate-650 line-through opacity-45";
                    } else if (elem.category === "servicios") {
                      if ((elem.symbol === "Wf" || elem.symbol === "Lz") && !isAvailable) {
                        catColor = "bg-rose-950/60 border-rose-600 text-rose-400 font-extrabold shadow-lg shadow-rose-500/10";
                      } else {
                        catColor = isAvailable 
                          ? "bg-sky-950/65 border-sky-600/70 text-sky-200 shadow-lg shadow-sky-500/5"
                          : "bg-slate-950/40 border-slate-850 text-slate-650 line-through opacity-45";
                      }
                    } else if (elem.category === "ropa") {
                      catColor = isAvailable 
                        ? "bg-purple-950/65 border-purple-600/70 text-purple-200 shadow-lg shadow-purple-500/5"
                        : "bg-slate-950/40 border-slate-850 text-slate-650 line-through opacity-45";
                    } else if (elem.category === "higiene") {
                      catColor = isAvailable 
                        ? "bg-teal-950/65 border-teal-600/70 text-teal-200 shadow-lg shadow-teal-500/5"
                        : "bg-slate-950/40 border-slate-850 text-slate-650 line-through opacity-45";
                    } else if (elem.category === "salud") {
                      catColor = isAvailable 
                        ? "bg-rose-950/65 border-rose-600/70 text-rose-200 shadow-lg shadow-rose-500/5"
                        : "bg-slate-950/40 border-slate-850 text-slate-650 line-through opacity-45";
                    }

                    const activeBorder = isAvailable && isAuthorizedToEditSupplies
                      ? "hover:scale-105 hover:border-white/40"
                      : isAuthorizedToEditSupplies ? "hover:scale-105" : "";

                    return (
                      <button
                        key={elem.symbol}
                        type="button"
                        style={{ gridRow: elem.row, gridColumn: elem.col }}
                        onMouseEnter={() => setHoveredElement(elem)}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => {
                          if (isAuthorizedToEditSupplies) {
                            setSupplyStates((prev) => ({
                              ...prev,
                              [elem.symbol]: !isAvailable,
                            }));
                          }
                        }}
                        className={`relative flex flex-col justify-between p-0.5 sm:p-1 rounded border text-left cursor-pointer transition-all duration-200 select-none aspect-square ${catColor} ${activeBorder} ${
                          isDimmed ? "opacity-15 scale-95 saturate-50 pointer-events-none" : ""
                        }`}
                      >
                        {/* Top Corner Details */}
                        <div className="flex justify-between items-center w-full leading-none">
                          <span className="text-[5px] sm:text-[6px] font-bold opacity-45">{elem.num}</span>
                          <span className={`w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                        </div>

                        {/* Main Symbol & Emoji */}
                        <div className="flex flex-col items-center justify-center py-0.5 leading-none">
                          <span className="text-[8px] sm:text-xs select-none">{elem.emoji}</span>
                          <span className="text-[7px] sm:text-[9px] font-black tracking-wider select-none">{elem.symbol}</span>
                        </div>

                        {/* Name Bottom */}
                        <div className="text-center w-full leading-none overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">
                          <span className="text-[5px] sm:text-[6px] font-bold tracking-tight uppercase select-none opacity-80">{elem.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Element Detailed Panel (big periodic element display) */}
              <div className="bg-slate-950/60 border border-slate-850/80 rounded-2xl p-2.5 min-h-[50px] flex items-center justify-between gap-4">
                {hoveredElement ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center leading-none">
                        <span className="text-sm">{hoveredElement.emoji}</span>
                        <span className="text-[8px] font-black text-slate-400">{hoveredElement.symbol}</span>
                      </div>
                      <div className="flex flex-col leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-white">{hoveredElement.name}</span>
                          <span className={`text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            hoveredElement.category === "alimentos" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            hoveredElement.category === "servicios" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                            hoveredElement.category === "ropa" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            hoveredElement.category === "higiene" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {hoveredElement.category}
                          </span>
                        </div>
                        <span className="text-[8.5px] text-slate-400 leading-normal font-medium">{hoveredElement.description}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${supplyStates[hoveredElement.symbol] !== false ? "text-emerald-400" : "text-rose-500"}`}>
                        {supplyStates[hoveredElement.symbol] !== false ? "🟢 Disponible" : hoveredElement.symbol === "Wf" ? "🔴 Sin WiFi" : hoveredElement.symbol === "Lz" ? "🔴 Sin Luz" : "🔴 Agotado"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full py-1 text-center">
                    <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                      💡 <em>Coloque el cursor o mantenga presionado un elemento para ver su descripción. Toque para alternar estado.</em>
                    </p>
                  </div>
                )}
              </div>

              {/* Matching Supplies Detailed List */}
              <div className="flex-1 overflow-y-auto max-h-[160px] border border-slate-850/60 rounded-2xl bg-slate-950/40 p-2 flex flex-col gap-1.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">
                  {supplySearchQuery || selectedSupplyCategory !== "todos" ? "🔍 Resultados de Búsqueda / Filtro" : "📦 Listado Completo de Insumos"}
                </span>
                
                {filteredSuppliesList.length === 0 ? (
                  <div className="text-center py-4 text-[9px] text-slate-500 italic">
                    No se encontraron insumos coincidentes.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredSuppliesList.map((elem) => {
                      const isAvailable = supplyStates[elem.symbol] !== false;
                      return (
                        <div 
                          key={elem.symbol}
                          className={`flex items-center justify-between p-2 rounded-xl border transition ${
                            isAvailable 
                              ? "bg-slate-900/60 border-slate-800" 
                              : "bg-rose-950/15 border-rose-900/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{elem.emoji}</span>
                            <div className="flex flex-col leading-none">
                              <span className="text-[9.5px] font-black text-white">{elem.name} ({elem.symbol})</span>
                              <span className="text-[7.5px] text-slate-400 mt-0.5 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap" title={elem.description}>
                                {elem.description}
                              </span>
                            </div>
                          </div>
                          
                          {isAuthorizedToEditSupplies ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSupplyStates((prev) => ({
                                  ...prev,
                                  [elem.symbol]: !isAvailable,
                                }));
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase cursor-pointer transition ${
                                isAvailable 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {isAvailable ? "Disponible" : "Agotado"}
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                              isAvailable 
                                ? "bg-emerald-500/5 text-emerald-500/60"
                                : "bg-rose-500/5 text-rose-500/60"
                            }`}>
                              {isAvailable ? "Disponible" : "Agotado"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 border-t border-slate-800/80 pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuppliesOpen(false);
                    setActiveSuppliesPunto(null);
                  }}
                  className="flex-1 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black transition cursor-pointer"
                >
                  Cerrar sin guardar
                </button>
                {isAuthorizedToEditSupplies ? (
                  <button
                    type="button"
                    onClick={handleSaveSupplies}
                    className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white rounded-xl text-[10px] font-black transition shadow-lg cursor-pointer"
                  >
                    Guardar Inventario
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2 bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black cursor-not-allowed opacity-50"
                  >
                    Inventario Bloqueado
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* 11. Seismic Bulletin Modal */}
      {isSeismicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💥</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Boletín Sísmico Reciente
                </h3>
              </div>
              <button
                onClick={() => setIsSeismicOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Fuente: <strong className="text-slate-400">USGS Earthquake Hazards Program</strong> • Últimas 48 horas • Zona Venezuela (Magnitud ≥ 3.5)
            </p>

            {(!alerts.seismic || alerts.seismic.length === 0) ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
                <span className="text-4xl">🟢</span>
                <p className="text-xs font-bold text-slate-400">Sin sismos detectados en las últimas 48 horas</p>
                <p className="text-[10px] text-center text-slate-500 leading-relaxed">La zona de Venezuela presenta actividad sísmica dentro de parámetros normales para este periodo.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...(alerts.seismic || [])].sort((a: any, b: any) =>
                  new Date(b.creado_at).getTime() - new Date(a.creado_at).getTime()
                ).map((s: any) => {
                  const mag = parseFloat(s.mag ?? 0);
                  const magBg =
                    mag >= 6.0 ? "bg-rose-950/50 border-rose-700/50" :
                    mag >= 5.0 ? "bg-orange-950/50 border-orange-700/50" :
                    mag >= 4.0 ? "bg-amber-950/50 border-amber-700/50" :
                                 "bg-slate-950/50 border-slate-700/50";
                  const magNumColor =
                    mag >= 6.0 ? "text-rose-400" :
                    mag >= 5.0 ? "text-orange-400" :
                    mag >= 4.0 ? "text-amber-400" :
                                 "text-slate-300";
                  const magLabel =
                    mag >= 6.0 ? "FUERTE" :
                    mag >= 5.0 ? "MODERADO" :
                    mag >= 4.0 ? "LEVE" : "MICRO";
                  const depthLabel =
                    s.depth != null && parseFloat(s.depth) <= 20 ? "Superficial ⚠️" :
                    s.depth != null && parseFloat(s.depth) <= 70 ? "Intermedio" :
                    s.depth != null ? "Profundo" : "—";
                  const fecha = s.creado_at ? new Date(s.creado_at).toLocaleString("es-VE", {
                    timeZone: "America/Caracas",
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  }) : "—";
                  return (
                    <div key={s.id} className={`rounded-2xl border ${magBg} p-3 flex flex-col gap-2.5`}>
                      {/* Top row: magnitude + date */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-3xl font-black ${magNumColor}`}>{mag.toFixed(1)}</span>
                          <div className="flex flex-col leading-none">
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest ${magNumColor}`}>{magLabel}</span>
                            <span className="text-[8px] font-bold text-slate-500">Magnitud Mw</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold text-slate-400">📅 {fecha}</span>
                          <div className="flex items-center gap-2">
                            {s.url && (
                              <a href={s.url} target="_blank" rel="noreferrer"
                                className="text-[9px] text-sky-400 hover:text-sky-300 font-bold underline">
                                USGS ↗
                              </a>
                            )}
                            {s.lat && s.lng && (
                              <>
                                <span className="text-[8px] text-slate-650">•</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSeismicOpen(false);
                                    setMapViewControllerTrigger({
                                      center: [parseFloat(s.lat), parseFloat(s.lng)],
                                      zoom: 12,
                                      timestamp: Date.now()
                                    });
                                  }}
                                  className="text-[9px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                                >
                                  Ver mapa 📍
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex flex-col gap-0.5 bg-slate-950/40 rounded-xl p-2">
                          <span className="text-[8px] uppercase tracking-widest font-extrabold text-slate-500">📍 Ubicación</span>
                          <span className="text-[10px] font-semibold text-slate-200 leading-snug">{s.place || "Desconocido"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 bg-slate-950/40 rounded-xl p-2">
                          <span className="text-[8px] uppercase tracking-widest font-extrabold text-slate-500">🕳️ Profundidad</span>
                          <span className="text-[10px] font-bold text-slate-200">
                            {s.depth != null ? `${parseFloat(s.depth).toFixed(1)} km` : "—"}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold">{depthLabel}</span>
                        </div>
                        {s.lat && s.lng && (
                          <div className="flex flex-col gap-0.5 bg-slate-950/40 rounded-xl p-2 col-span-2">
                            <span className="text-[8px] uppercase tracking-widest font-extrabold text-slate-500">🌐 Coordenadas (clic = Google Maps)</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                              target="_blank" rel="noreferrer"
                              className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 underline"
                            >
                              {parseFloat(s.lat).toFixed(4)}°, {parseFloat(s.lng).toFixed(4)}°
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[9px] text-slate-600 text-center leading-relaxed border-t border-slate-800/60 pt-3">
              Para reportes locales venezolanos, consultar <strong className="text-slate-500">FUNVISIS</strong> (funvisis.gob.ve).
            </p>
          </div>
        </div>
      )}

      {/* 8. Help / Credits Modal */}
      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Ayuda e Información
                </h3>
              </div>
              <button
                onClick={() => setIsCreditsOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
              <div>
                <h4 className="font-extrabold text-orange-400 uppercase tracking-widest text-[9px] mb-1">
                  ¿Cómo funciona la app?
                </h4>
                <p>
                  Esta plataforma recopila centros de acopio, hospitales operativos, emergencias civiles, redes de WiFi libres y vehículos de suministro en tiempo real para coordinar la respuesta humanitaria.
                </p>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <h4 className="font-extrabold text-orange-400 uppercase tracking-widest text-[9px] mb-2">
                  Créditos de Información (Fuentes)
                </h4>
                <ul className="flex flex-col gap-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">🔑</span>
                    <div>
                      <strong>Personas Localizadas:</strong> Datos consolidados por{" "}
                      <a href="https://localizadosvenezuela.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300 transition">
                        Localizados Venezuela
                      </a>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">🤝</span>
                    <div>
                      <strong>Ayudas Ciudadanas:</strong> Registro e incidencias mapeadas por{" "}
                      <a href="https://caracasayuda.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300 transition">
                        Caracas Ayuda
                      </a>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">📦</span>
                    <div>
                      <strong>Centros de Acopio y Voluntarios:</strong> Información proveída por{" "}
                      <a href="https://ayudaparavenezuela.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300 transition">
                        Ayuda por Venezuela
                      </a>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">🌐</span>
                    <div>
                      <strong>Puntos de Internet / WiFi:</strong> Información satelital proveída en tiempo real por{" "}
                      <a href="https://www.reconectavenezuela.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300 transition font-bold">
                        Reconecta Venezuela
                      </a>.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <h4 className="font-extrabold text-orange-400 uppercase tracking-widest text-[9px] mb-2">
                  Colaboradores y Desarrollo
                </h4>
                <p className="mb-2">
                  Agradecemos a los colaboradores comunitarios de desarrollo que han ayudado a integrar y optimizar estos sistemas críticos:
                </p>
                <div className="flex gap-4">
                  <a href="https://x.com/vxlentinF" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-200 transition font-bold">
                    <span>💻</span>
                    <span>@vxlentinF</span>
                  </a>
                  <a href="https://x.com/dergamer777" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-200 transition font-bold">
                    <span>🎮</span>
                    <span>@dergamer777</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8.5. Marker Move Confirmation Modal */}
      {pendingMove && isOwner && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-orange-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-xl">📦</span>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Confirmar Posición
              </h3>
            </div>

            <div className="text-slate-300 text-xs flex flex-col gap-3 leading-relaxed">
              <p>
                ¿Deseas guardar la nueva posición para el marcador{" "}
                <strong className="text-orange-400">"{pendingMove.nombre}"</strong>?
              </p>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                <div>
                  <span className="text-slate-500">Origen:</span> {pendingMove.prevLat.toFixed(6)}, {pendingMove.prevLng.toFixed(6)}
                </div>
                <div>
                  <span className="text-emerald-500">Destino:</span> {pendingMove.lat.toFixed(6)}, {pendingMove.lng.toFixed(6)}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Al confirmar, la nueva ubicación se actualizará en tiempo real en los mapas de todos los usuarios activos.
              </p>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={cancelMarkerMove}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700/50 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMarkerMove}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-lg shadow-orange-500/25"
              >
                Confirmar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Admin Panel Modal (Grant/revoke permissions) */}
      {/* 9. Admin Panel Modal (Grant/revoke permissions & manage alerts) */}
      {isAdminPanelOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[85dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Panel de Administración
                </h3>
              </div>
              <button
                onClick={() => setIsAdminPanelOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-none">
              {/* Sección 1: Administradores (Sólo Dueño de la App) */}
              {isOwner ? (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">
                    👥 Gestionar Administradores
                  </span>
                  
                  {/* Grant Permission Form */}
                  <form onSubmit={handleAddAdmin} className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Agregar nuevo administrador con rol
                    </label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs focus:outline-none focus:border-orange-500/50 cursor-pointer font-semibold"
                        >
                          <option value="center_admin">Encargado de Centro</option>
                          <option value="ceo">CEO (Admins - No Inventarios)</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer shrink-0"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Admin List */}
                  <div className="flex flex-col gap-2">
                    {/* Owner card */}
                    <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/30">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">sergioantia11@gmail.com</span>
                        <span className="text-[8px] text-orange-400 uppercase font-black tracking-wider mt-0.5">Dueño de la App</span>
                      </div>
                    </div>

                    {/* Extra admins */}
                    {adminsWithRoles.length === 0 ? (
                      <div className="text-center py-3 text-slate-500 text-xs italic">
                        No hay otros administradores registrados.
                      </div>
                    ) : (
                      adminsWithRoles.map((admin) => (
                        <div key={admin.email} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 hover:border-slate-800 transition">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-300 font-medium">{admin.email}</span>
                            <span className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${
                              admin.role === "ceo" ? "text-sky-400" : "text-amber-500"
                            }`}>
                              {admin.role === "ceo" ? "CEO (Admins - No Inventarios)" : "Encargado de Centro"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(admin.email)}
                            className="px-2 py-1 text-[9px] font-extrabold text-rose-400 hover:text-white hover:bg-rose-950/45 border border-rose-900/30 rounded-lg transition cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-slate-400 text-xs leading-relaxed">
                  🔑 Iniciaste sesión como <strong>Administrador</strong>. Solo el dueño de la app (sergioantia11@gmail.com) puede agregar o remover otros administradores.
                </div>
              )}

              {/* Sección 1.5: Autorizar Psicólogos (Todos los Admins) */}
              <div className="border-t border-slate-800/80 pt-4 mt-2 flex flex-col gap-3">
                <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">
                  🧠 Autorizar Psicólogos
                </span>

                {/* Grant Psychologist Permission Form */}
                <form onSubmit={handleAddPsychPerm} className="flex flex-col gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Autorizar correo de Psicólogo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={newPsychPermEmail}
                      onChange={(e) => setNewPsychPermEmail(e.target.value)}
                      placeholder="psicologo@correo.com"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
                    >
                      Autorizar
                    </button>
                  </div>
                </form>

                {/* Authorized Psychologists List */}
                <div className="flex flex-col gap-2 max-h-[15dvh] overflow-y-auto pr-1">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                    Psicólogos Autorizados
                  </span>
                  {authorizedPsychs.length === 0 ? (
                    <div className="text-center py-3 text-slate-500 text-[10px] italic">
                      No hay psicólogos autorizados registrados.
                    </div>
                  ) : (
                    authorizedPsychs.map((email) => (
                      <div key={email} className="flex justify-between items-center bg-slate-950/45 p-2.5 rounded-xl border border-slate-850 hover:border-slate-800 transition">
                        <span className="text-xs text-slate-350 font-medium truncate flex-1 mr-2">{email}</span>
                        <button
                          onClick={() => handleRemovePsychPerm(email)}
                          className="px-2 py-0.5 text-[8px] font-extrabold text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-900/30 rounded transition shrink-0 cursor-pointer"
                        >
                          Revocar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sección 2: Gestión de Alertas Críticas (Todos los Admins) */}
              <div className="border-t border-slate-800/80 pt-4 mt-2 flex flex-col gap-3">
                <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">
                  📢 Gestión de Alertas Críticas
                </span>

                {/* Form to create alert */}
                <form onSubmit={handleCreateAlert} className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Mensaje de la Alerta
                    </label>
                    <textarea
                      required
                      value={newAlertText}
                      onChange={(e) => setNewAlertText(e.target.value)}
                      placeholder="Ej. Corte de luz programado de 4 horas en Lechería..."
                      rows={2}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tipo:</label>
                      <select
                        value={newAlertTipo}
                        onChange={(e) => setNewAlertTipo(e.target.value as "critico" | "info")}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-350 text-[10px] focus:outline-none focus:border-orange-500/50"
                      >
                        <option value="critico">🔴 Crítico (Rojo)</option>
                        <option value="info">🔵 Informativo (Azul)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold transition shadow-md cursor-pointer"
                    >
                      Crear Alerta
                    </button>
                  </div>
                </form>

                {/* Alerts List */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                    Alertas Manuales Activas
                  </span>
                  {(!alerts.manual || alerts.manual.length === 0) ? (
                    <div className="text-center py-4 text-slate-500 text-[10px] italic">
                      No hay alertas manuales activas.
                    </div>
                  ) : (
                    alerts.manual.map((a: any) => (
                      <div key={a.id} className="flex justify-between items-start gap-3 bg-slate-950/45 p-2.5 rounded-xl border border-slate-850 hover:border-slate-800 transition">
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-[10px] text-slate-200 leading-normal">{a.mensaje}</span>
                          <div className="flex items-center gap-2 text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                            <span className={a.tipo === 'critico' ? 'text-rose-450' : 'text-blue-450'}>
                              {a.tipo === 'critico' ? 'Crítico' : 'Informativo'}
                            </span>
                            <span>•</span>
                            <span>{new Date(a.creado_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleDeactivateAlert(a.id)}
                          className="px-2 py-0.5 text-[8px] font-extrabold text-rose-450 hover:text-white hover:bg-rose-950 border border-rose-900/30 rounded transition shrink-0 mt-0.5 cursor-pointer"
                        >
                          Desactivar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. ONU Report Modal */}
      {isONUReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Cifras del Reporte ONU
                  </h3>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                    Fuente oficial: OCHA / INSARAG · Actualizado en tiempo real
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsONUReportOpen(false);
                  setIsONUEditing(false);
                }}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isONUEditing ? (
              <form onSubmit={handleSaveONUReport} className="flex flex-col gap-3 text-xs leading-relaxed">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider text-center">Fallecidos</label>
                    <input
                      type="number"
                      required
                      value={editOnuFallecidos}
                      onChange={(e) => setEditOnuFallecidos(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 transition-colors text-center font-bold text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider text-center">Heridos</label>
                    <input
                      type="number"
                      required
                      value={editOnuHeridos}
                      onChange={(e) => setEditOnuHeridos(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 transition-colors text-center font-bold text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider text-center">Desaparecidos</label>
                    <input
                      type="text"
                      required
                      value={editOnuDesaparecidos}
                      onChange={(e) => setEditOnuDesaparecidos(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 transition-colors text-center font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Detalles de Emergencia</label>
                  <textarea
                    rows={3}
                    required
                    value={editOnuDescripcion}
                    onChange={(e) => setEditOnuDescripcion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 transition-colors resize-none text-[11px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Respuesta Humanitaria Internacional</label>
                  <textarea
                    rows={3}
                    required
                    value={editOnuRespuesta}
                    onChange={(e) => setEditOnuRespuesta(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500 transition-colors resize-none text-[11px]"
                  />
                </div>

                <div className="flex items-center gap-3 border-t border-slate-850 pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsONUEditing(false)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-[10px] font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-orange-650 hover:bg-orange-600 text-white rounded-xl transition cursor-pointer text-[10px] font-bold shadow-lg shadow-orange-950/20"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-xs leading-relaxed font-sans">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center shadow-lg">
                    <span className="text-xl mb-1">💀</span>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Fallecidos</span>
                    <span className="text-lg font-black text-rose-500 mt-0.5">{onuFallecidos.toLocaleString()}</span>
                    <span className="text-[8px] text-slate-600 mt-0.5">confirmados</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center shadow-lg">
                    <span className="text-xl mb-1">🤕</span>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Heridos</span>
                    <span className="text-lg font-black text-amber-500 mt-0.5">{onuHeridos.toLocaleString()}</span>
                    <span className="text-[8px] text-slate-600 mt-0.5">reportados</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center shadow-lg">
                    <span className="text-xl mb-1">ℹ️</span>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Desapar.</span>
                    <span className="text-lg font-black text-sky-500 mt-0.5">{onuDesaparecidos}</span>
                    <span className="text-[8px] text-slate-600 mt-0.5">preliminar</span>
                  </div>
                </div>

                {/* Context */}
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                  <div>
                    <h4 className="font-extrabold text-orange-400 uppercase tracking-widest text-[9px] mb-1">
                      Emergencia Sísmica
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {onuDescripcion}
                    </p>
                  </div>
                  <div className="border-t border-slate-800/60 pt-2.5">
                    <h4 className="font-extrabold text-orange-400 uppercase tracking-widest text-[9px] mb-1">
                      Respuesta Internacional
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {onuRespuesta}
                    </p>
                  </div>
                </div>

                {/* Official Links */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] px-0.5">
                    🇺🇳 Fuentes Oficiales de la ONU
                  </h4>
                  <a
                    href="https://reliefweb.int/disaster/eq-2026-000109-ven"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/60 hover:border-blue-600/70 hover:bg-blue-950/70 transition group"
                  >
                    <span className="text-lg">🌐</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-blue-300 group-hover:text-blue-200">ReliefWeb · OCHA</span>
                      <span className="text-[9px] text-slate-500">Venezuela: Earthquakes (June 2026) 🇺🇳 Situación completa</span>
                    </div>
                    <span className="ml-auto text-slate-600 group-hover:text-blue-400 text-xs">↗️</span>
                  </a>
                  <a
                    href="https://www.unocha.org/venezuela"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/60 hover:border-blue-600/70 hover:bg-blue-950/70 transition group"
                  >
                    <span className="text-lg">🇺🇳</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-blue-300 group-hover:text-blue-200">OCHA Venezuela</span>
                      <span className="text-[9px] text-slate-500">unocha.org · Coordinación Humanitaria Oficial</span>
                    </div>
                    <span className="ml-auto text-slate-600 group-hover:text-blue-400 text-xs">↗️</span>
                  </a>
                  <a
                    href="https://www.insarag.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/60 hover:border-blue-600/70 hover:bg-blue-950/70 transition group"
                  >
                    <span className="text-lg">🚨</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-blue-300 group-hover:text-blue-200">INSARAG · ONU</span>
                      <span className="text-[9px] text-slate-500">Equipos internacionales de Búsqueda y Rescate Urbano</span>
                    </div>
                    <span className="ml-auto text-slate-600 group-hover:text-blue-400 text-xs">↗️</span>
                  </a>
                  <a
                    href="https://www.paho.org/es/venezuela"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/60 hover:border-blue-600/70 hover:bg-blue-950/70 transition group"
                  >
                    <span className="text-lg">🏥</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-blue-300 group-hover:text-blue-200">OPS / OMS Venezuela</span>
                      <span className="text-[9px] text-slate-500">paho.org · Respuesta sanitaria y epidemiológica</span>
                    </div>
                    <span className="ml-auto text-slate-600 group-hover:text-blue-400 text-xs">↗️</span>
                  </a>
                </div>

                <p className="text-center text-[9px] text-slate-600 px-2">
                  Las cifras son dinámicas y pueden actualizarse conforme avancen las labores de rescate. Consulta las fuentes oficiales para los datos más recientes.
                </p>

                {/* Botón de edición para administradores */}
                {isAdmin && (
                  <div className="border-t border-slate-800/80 pt-3 flex justify-end">
                    <button
                      onClick={handleStartEditONU}
                      className="px-3 py-1.5 text-[9px] font-extrabold text-orange-400 bg-orange-950/20 border border-orange-900/60 rounded-xl hover:bg-orange-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      ✏️ Editar Cifras ONU
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 11. Directorio de Asistencia Psicológica Modal */}
      {isPsychOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Apoyo Psicológico Comunitario
                  </h3>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                    Directorio de profesionales, voluntariado y consulta social accesible
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPsychologist && (
                  <button
                    onClick={() => {
                      setEditingPsych(null);
                      setPsychEsInstitucion(false);
                      if (!isAdmin && user) {
                        setPsychEmail(user.email);
                      }
                      setIsPsychFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-purple-400 bg-purple-955/40 border border-purple-900/60 rounded-xl hover:bg-purple-950 hover:border-purple-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {isAdmin ? "Registrar Profesional / Institución" : "Crear mi Perfil de Psicólogo"}
                  </button>
                )}
                <button
                  onClick={() => setIsPsychOpen(false)}
                  className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pestañas de Filtro */}
            <div className="flex gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-850 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setPsychActiveTab("todos")}
                className={`flex-1 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition cursor-pointer min-w-[70px] ${psychActiveTab === "todos" ? 'bg-slate-900 border border-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🌍 Todos
              </button>
              <button
                type="button"
                onClick={() => setPsychActiveTab("gratuito")}
                className={`flex-1 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition cursor-pointer min-w-[120px] ${psychActiveTab === "gratuito" ? 'bg-purple-955/40 border border-purple-900/60 text-purple-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                💜 Profesionales Gratis
              </button>
              <button
                type="button"
                onClick={() => setPsychActiveTab("social")}
                className={`flex-1 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition cursor-pointer min-w-[120px] ${psychActiveTab === "social" ? 'bg-blue-950/40 border border-blue-900/60 text-blue-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🤝 Tarifas Solidarias
              </button>
              <button
                type="button"
                onClick={() => setPsychActiveTab("lineas")}
                className={`flex-1 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition cursor-pointer min-w-[110px] ${psychActiveTab === "lineas" ? 'bg-blue-955/20 border border-blue-900/40 text-blue-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🏢 Líneas de Ayuda
              </button>
            </div>

            {/* Aclaratoria de Transparencia Obligatoria */}
            {psychActiveTab === "social" && (
              <div className="p-3 bg-blue-955/10 border border-blue-900/40 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <span className="text-sm">ℹ️</span>
                <p className="text-[10px] text-blue-300 leading-normal">
                  Los profesionales en esta sección ofrecen <strong>Tarifas Sociales Reducidas</strong> de forma solidaria para hacer la salud mental accesible a la comunidad. Nuestra plataforma no percibe comisiones por estos servicios.
                </p>
              </div>
            )}

            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre, especialidad, institución o palabra clave..."
                value={searchPsych}
                onChange={(e) => setSearchPsych(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-850 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>

            {/* Listado */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
              {filteredPsychs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No se encontraron profesionales o instituciones en esta categoría que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPsychs.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setExpandedPsychId(expandedPsychId === p.id ? null : p.id)}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-lg relative group overflow-hidden hover:border-slate-800 transition-colors cursor-pointer bg-slate-950/60 border-slate-850`}
                    >
                      <div className="flex gap-3">
                        {/* Foto de perfil o ícono de institución */}
                        <div className={`w-12 h-12 rounded-2xl border flex-shrink-0 overflow-hidden flex items-center justify-center ${p.es_institucion ? 'bg-blue-955/40 border-blue-900/40' : 'bg-purple-955/40 border-purple-900/40'}`}>
                          {p.foto_url ? (
                            <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                          ) : p.es_institucion ? (
                            <span className="text-lg font-bold text-blue-400">🏢</span>
                          ) : (
                            <span className="text-base font-bold text-purple-400">
                              {p.nombre.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-white truncate max-w-[70%]">{p.nombre}</h4>
                            {p.es_institucion && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-955/80 border border-blue-900/50 text-[7px] font-extrabold text-blue-400 uppercase tracking-wider flex-shrink-0">
                                Línea de Ayuda
                              </span>
                            )}
                            {p.activo === false && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-900/50 text-[7px] font-extrabold text-amber-400 uppercase tracking-wider flex-shrink-0 animate-pulse">
                                Pendiente Aprobación
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-extrabold block truncate ${p.es_institucion ? 'text-blue-400' : 'text-purple-400'}`}>
                            {p.titulo}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-900 text-[8px] font-bold text-slate-400 border border-slate-800/80">
                              🎯 {p.especialidad}
                            </span>
                            {p.tipo_servicio === "social" ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-955/20 text-[8px] font-extrabold text-blue-400 border border-blue-900/30 animate-pulse">
                                🤝 Tarifa Social: {p.monto_tarifa} {p.moneda_tarifa || "USD"}
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-purple-955/20 text-[8px] font-extrabold text-purple-400 border border-purple-900/30">
                                💜 100% Gratuito
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                        {expandedPsychId === p.id && p.descripcion && (
                          <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed bg-slate-900/30 p-2 rounded-xl border border-slate-900 animate-in fade-in duration-200">
                            {p.descripcion}
                          </p>
                        )}

                        {expandedPsychId === p.id && (
                          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-850">
                                🗣️ {p.idiomas || "Español"}
                              </span>
                              {!p.es_institucion && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-850">
                                  💻 {p.modalidad === "online" ? "Online" : p.modalidad === "presencial" ? "Presencial" : "Ambas"}
                                </span>
                              )}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-2 border-t border-slate-900 pt-3" onClick={(e) => e.stopPropagation()}>
                              {p.whatsapp && (
                                <a
                                  href={`https://wa.me/${p.whatsapp.replace(/\+/g, "").replace(/\s/g, "")}?text=Hola,%20vi%20tu%20contacto%20en%20Punto%20de%20Apoyo%20VZ%20y%20requiero%20asistencia%20psicológica`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 text-[9px] font-extrabold text-emerald-400 hover:text-white bg-emerald-950/20 hover:bg-emerald-600/80 border border-emerald-900/60 rounded-xl transition flex items-center gap-1"
                                >
                                  💬 WhatsApp
                                </a>
                              )}
                              {p.telefono && (
                                <a
                                  href={`tel:${p.telefono}`}
                                  className="px-2.5 py-1.5 text-[9px] font-extrabold text-blue-400 hover:text-white bg-blue-950/20 hover:bg-blue-600/80 border border-blue-900/60 rounded-xl transition flex items-center gap-1"
                                >
                                  📞 {p.es_institucion ? "Línea de Ayuda" : "Llamar"}
                                </a>
                              )}
                              {p.booking_url && (
                                <>
                                  <a
                                    href={p.booking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`px-2.5 py-1.5 text-[9px] font-extrabold hover:text-white border border-blue-900/60 rounded-xl transition flex items-center gap-1 text-blue-400 bg-blue-950/20 hover:bg-blue-600/80 ${p.es_institucion ? 'ml-auto' : ''}`}
                                  >
                                    📅 {p.es_institucion ? "Sitio Web" : "Agendar"}
                                  </a>
                                  {!p.es_institucion && (
                                    <button
                                      onClick={() => setActiveBookingUrl(p.booking_url!)}
                                      className="px-2.5 py-1.5 text-[9px] font-extrabold hover:text-white border border-purple-900/60 rounded-xl transition flex items-center gap-1 text-purple-400 bg-purple-950/20 hover:bg-purple-600/80 ml-auto"
                                    >
                                      📄 Formulario Rápido
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {/* Admin / Owner Controls */}
                              {isAdmin && (
                                <div className="flex gap-1 ml-auto">
                                  {p.activo === false && (
                                    <button
                                      onClick={() => handleToggleApprovePsych(p)}
                                      className="w-6 h-6 rounded bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900 hover:text-emerald-300 flex items-center justify-center transition border border-emerald-900/50"
                                      title="Aprobar Profesional"
                                    >
                                      ✓
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleStartEditPsych(p)}
                                    className="w-6 h-6 rounded bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center transition"
                                    title="Editar"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => handleDeletePsychologist(p.id)}
                                    className="w-6 h-6 rounded bg-rose-950/30 text-rose-500 hover:bg-rose-900 hover:text-rose-300 flex items-center justify-center transition border border-rose-900/50"
                                    title="Eliminar"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. Formulario de Registro/Edición de Psicólogo Modal */}
      {isPsychFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSavePsychologist}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{psychEsInstitucion ? "🏢" : "🧑‍⚕️"}</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingPsych ? "Editar Registro" : "Registrar Profesional/Institución"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClosePsychForm}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Categoría de Registro */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Categoría *</label>
              <div className="flex flex-col sm:flex-row gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setPsychEsInstitucion(false);
                    setPsychTipoServicio("gratuito");
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${(!psychEsInstitucion && psychTipoServicio === "gratuito") ? 'bg-purple-650 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  🧑‍⚕️ Profesional Gratis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPsychEsInstitucion(false);
                    setPsychTipoServicio("social");
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${(!psychEsInstitucion && psychTipoServicio === "social") ? 'bg-blue-650 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  🤝 Tarifa Solidaria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPsychEsInstitucion(true);
                    setPsychTipoServicio("gratuito");
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${psychEsInstitucion ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  🏢 Línea de Ayuda
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {psychEsInstitucion ? "Nombre de la Institución / Línea *" : "Nombre Completo *"}
                </label>
                <input
                  type="text"
                  required
                  value={psychNombre}
                  onChange={(e) => setPsychNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder={psychEsInstitucion ? "Ej: Cruz Roja - Línea de Apoyo Psicológico" : "Ej: Dra. María Rodríguez"}
                />
              </div>

              {!psychEsInstitucion && (
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Título Académico *</label>
                  <input
                    type="text"
                    required={!psychEsInstitucion}
                    value={psychTitulo}
                    onChange={(e) => setPsychTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ej: Psicólogo Clínico (UCV)"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {psychEsInstitucion ? "Tipo de Ayuda / Enfoque *" : "Especialidad *"}
                </label>
                <input
                  type="text"
                  required
                  value={psychEspecialidad}
                  onChange={(e) => setPsychEspecialidad(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder={psychEsInstitucion ? "Ej: Línea telefónica nacional, apoyo en crisis, prevención del suicidio" : "Ej: Trauma, duelo, ansiedad en crisis"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {psychEsInstitucion ? "Número de la Línea de Ayuda" : "Teléfono"}
                  </label>
                  <input
                    type="text"
                    value={psychTelefono}
                    onChange={(e) => setPsychTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ej: 0800-AYUDA-00 / +582121234567"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">WhatsApp (opcional)</label>
                  <input
                    type="text"
                    value={psychWhatsapp}
                    onChange={(e) => setPsychWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ej: +584121234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                  <input
                    type="email"
                    value={psychEmail}
                    onChange={(e) => setPsychEmail(e.target.value)}
                    disabled={!isAdmin}
                    className={`w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors ${!isAdmin ? 'opacity-65 cursor-not-allowed text-slate-400' : ''}`}
                    placeholder="Ej: contacto@institucion.org"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Idiomas</label>
                  <input
                    type="text"
                    value={psychIdiomas}
                    onChange={(e) => setPsychIdiomas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ej: Español, Inglés"
                  />
                </div>
              </div>

              {!psychEsInstitucion && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Modalidad</label>
                    <select
                      value={psychModalidad}
                      onChange={(e) => setPsychModalidad(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="online">Online</option>
                      <option value="presencial">Presencial</option>
                      <option value="ambas">Ambas</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">URL de Foto</label>
                    <input
                      type="url"
                      value={psychFotoUrl}
                      onChange={(e) => setPsychFotoUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="https://ejemplo.com/foto.jpg"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {psychEsInstitucion ? "Enlace al Portal Oficial (Web) / Portal de Citas" : "Enlace de Reservas (Google Calendar / Cal.com / Calendly)"}
                </label>
                <input
                  type="url"
                  value={psychBookingUrl}
                  onChange={(e) => setPsychBookingUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder={psychEsInstitucion ? "https://cruzroja.org.ve/ayuda" : "https://calendar.google.com/calendar/appointments/schedules/... o Cal.com"}
                />
              </div>

              {/* Costos (Solo si es Profesional de Tarifa Solidaria) */}
              {!psychEsInstitucion && psychTipoServicio === "social" && (
                <div className="flex flex-col gap-2.5 p-3 bg-slate-950/60 rounded-2xl border border-slate-850 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Monto de la Consulta</label>
                      <input
                        type="number"
                        min="0"
                        value={psychMontoTarifa}
                        onChange={(e) => setPsychMontoTarifa(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition-colors text-xs font-bold"
                        placeholder="Ej: 10"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Moneda</label>
                      <select
                        value={psychMonedaTarifa}
                        onChange={(e) => setPsychMonedaTarifa(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition-colors text-xs font-semibold"
                      >
                        <option value="USD">USD</option>
                        <option value="BS">Bs.</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {psychEsInstitucion ? "Descripción de la Institución y Servicios" : "Descripción / Bio Corta"}
                </label>
                <textarea
                  rows={2}
                  value={psychDescripcion}
                  onChange={(e) => setPsychDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  placeholder={psychEsInstitucion ? "Línea activa las 24 horas, atención psicológica gratuita telefónica..." : "Breve reseña sobre la trayectoria profesional o modalidad de atención..."}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={handleClosePsychForm}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-[10px] font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-xl transition cursor-pointer text-[10px] font-bold shadow-lg shadow-purple-950/20"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 13. Modal de Agenda y Calendario Integrado (Iframe para Google Calendar/Cal.com/Calendly) */}
      {activeBookingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[85dvh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Agenda de Citas y Disponibilidad
                </h3>
              </div>
              <button
                onClick={() => setActiveBookingUrl(null)}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-850 bg-slate-950 relative">
              <iframe
                src={activeBookingUrl}
                className="w-full h-full border-0 bg-slate-950"
                allow="camera; microphone; geolocation; clipboard-write;"
              />
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
              <span>* Puedes agendar o revisar disponibilidad directamente desde este panel interactivo.</span>
              <a
                href={activeBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline font-bold"
              >
                Abrir en pestaña nueva ↗️
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 14. Últimas Noticias Modal */}
      {isNewsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200 max-h-[90dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Últimas Noticias Oficiales
                  </h3>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                    Boletín de novedades, avisos gubernamentales y reportes verificados
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => setIsNewsFormOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-955/40 border border-sky-900/60 rounded-xl hover:bg-sky-950 hover:border-sky-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Noticia
                  </button>
                )}
                <button
                  onClick={() => setIsNewsOpen(false)}
                  className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of News */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {puntos.filter((p) => p.tipo === "noticia").length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                  No hay noticias registradas por el momento.
                </div>
              ) : (
                puntos
                  .filter((p) => p.tipo === "noticia")
                  .sort((a, b) => new Date(b.creadoAt).getTime() - new Date(a.creadoAt).getTime())
                  .map((noticia) => {
                    const isNewsCreator = !!(
                      user &&
                      noticia.id.includes(`-creator-${user.email.toLowerCase()}`)
                    );
                    const canDelete = isAdmin || isOwner || isNewsCreator;

                    return (
                      <div
                        key={noticia.id}
                        className="p-4 bg-slate-950/60 border border-slate-850 hover:border-slate-800 transition-all duration-200 rounded-2xl flex flex-col gap-2 relative group"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] font-extrabold uppercase bg-sky-955/20 text-sky-400 border border-sky-900/40 px-2 py-0.5 rounded-full">
                            📰 Noticia Oficial
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold">
                            {new Date(noticia.creadoAt).toLocaleString()}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-white leading-tight mt-1">
                          {noticia.nombre}
                        </h4>
                        
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {noticia.descripcion}
                        </p>

                        {noticia.image_url && (
                          <div className="mt-2 relative rounded-2xl overflow-hidden max-h-[220px] border border-slate-900 shadow-md">
                            <img
                              src={noticia.image_url}
                              alt={noticia.nombre}
                              className="w-full h-full object-cover max-h-[220px]"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {noticia.fuente && (
                          <div className="mt-2 pt-2 border-t border-slate-900/60 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-bold text-slate-500">Fuente:</span>
                            {noticia.fuente.startsWith("http") ? (
                              <a
                                href={noticia.fuente}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:underline flex items-center gap-0.5 font-semibold"
                              >
                                {noticia.fuente} ↗️
                              </a>
                            ) : (
                              <span className="font-semibold text-slate-300">{noticia.fuente}</span>
                            )}
                          </div>
                        )}

                        {/* Options button bar */}
                        {canDelete && (
                          <div className="mt-2.5 pt-2 border-t border-slate-900/40 flex gap-2">
                            <button
                              onClick={() => {
                                setEditingNews(noticia);
                                setIsNewsFormOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleRepublishNews(noticia)}
                              className="px-2 py-1 bg-sky-955/20 hover:bg-sky-600/80 border border-sky-900/45 text-sky-400 hover:text-white rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1"
                            >
                              🔁 Republicar
                            </button>
                            <button
                              onClick={() => handleDeletePunto(noticia.id)}
                              className="px-2 py-1 bg-rose-955/20 hover:bg-rose-600/80 border border-rose-900/45 text-rose-500 hover:text-white rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1 ml-auto"
                            >
                              ❌ Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 15. Formulario de Nueva Noticia Modal */}
      {isNewsFormOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in scale-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                {editingNews ? <Plus className="w-4 h-4 text-orange-500" /> : <Plus className="w-4 h-4 text-sky-500" />}
                {editingNews ? "Editar Noticia" : "Publicar Nueva Noticia"}
              </h3>
              <button
                onClick={() => {
                  setEditingNews(null);
                  setIsNewsFormOpen(false);
                }}
                className="w-7 h-7 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const titulo = (e.target as any).titulo.value.trim();
                const contenido = (e.target as any).contenido.value.trim();
                const fuente = (e.target as any).fuente.value.trim();
                const imagenUrl = (e.target as any).imagenUrl.value.trim();

                if (!titulo || !contenido) return;

                if (editingNews) {
                  // Edit existing news
                  const updatedNoticia: PuntoReportado = {
                    ...editingNews,
                    nombre: titulo,
                    descripcion: contenido,
                    fuente: fuente || undefined,
                    image_url: imagenUrl || undefined,
                  };

                  const updated = puntos.map((p) => p.id === editingNews.id ? updatedNoticia : p);
                  setPuntos(updated);
                  localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

                  if (isSupabaseConfigured && supabase) {
                    const { error } = await supabase
                      .from("reports")
                      .update({
                        nombre: titulo,
                        descripcion: contenido,
                        fuente: fuente || null,
                        image_url: imagenUrl || null,
                      })
                      .eq("id", editingNews.id);
                    if (error) {
                      console.error("Error updating news in Supabase:", error);
                    }
                  }

                  setEditingNews(null);
                  setIsNewsFormOpen(false);
                  alert("¡Noticia actualizada con éxito!");
                } else {
                  // Create new news
                  const creadoAt = new Date().toISOString();
                  const randomId = Math.random().toString(36).substr(2, 9);
                  const creatorSuffix = user ? `-creator-${user.email.toLowerCase()}` : "-creator-anonymous";

                  const nuevaNoticia: PuntoReportado = {
                    id: `news-${randomId}${creatorSuffix}`,
                    tipo: "noticia",
                    categoria: "senal",
                    nombre: titulo,
                    descripcion: contenido,
                    fuente: fuente || undefined,
                    image_url: imagenUrl || undefined,
                    lat: 0,
                    lng: 0,
                    confirmations: 0,
                    creadoAt,
                    expiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
                    aprobado: true,
                    creadorAnonimo: user === null,
                  };

                  const updated = [nuevaNoticia, ...puntos];
                  setPuntos(updated);
                  localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

                  if (isSupabaseConfigured && supabase) {
                    const { error } = await supabase.from("reports").insert([nuevaNoticia]);
                    if (error) {
                      console.error("Error inserting news in Supabase:", error);
                    }
                  }

                  setIsNewsFormOpen(false);
                  alert("¡Noticia publicada con éxito!");
                }
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Título de la Noticia
                </label>
                <input
                  name="titulo"
                  type="text"
                  required
                  key={editingNews ? `edit-title-${editingNews.id}` : 'new-title'}
                  defaultValue={editingNews ? editingNews.nombre : ""}
                  placeholder="Ej. Decretan Estado de Emergencia en Yaracuy"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-sky-500/50 transition"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Contenido / Descripción
                </label>
                <textarea
                  name="contenido"
                  required
                  key={editingNews ? `edit-content-${editingNews.id}` : 'new-content'}
                  defaultValue={editingNews ? editingNews.descripcion : ""}
                  placeholder="Detalles sobre el anuncio o acontecimiento..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-sky-500/50 transition h-28 resize-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  URL de la Foto / Imagen (Opcional)
                </label>
                <input
                  name="imagenUrl"
                  type="text"
                  key={editingNews ? `edit-img-${editingNews.id}` : 'new-img'}
                  defaultValue={editingNews ? editingNews.image_url : ""}
                  placeholder="Ej. https://images.unsplash.com/photo-... o enlace directo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-sky-500/50 transition"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Fuente Oficial / Enlace (Opcional)
                </label>
                <input
                  name="fuente"
                  type="text"
                  key={editingNews ? `edit-src-${editingNews.id}` : 'new-src'}
                  defaultValue={editingNews ? editingNews.fuente : ""}
                  placeholder="Ej. https://www.ve.onu.org o OCHA Venezuela"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-sky-500/50 transition"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingNews(null);
                    setIsNewsFormOpen(false);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {editingNews ? "Guardar Cambios" : "Publicar Noticia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
