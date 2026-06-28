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
} from "lucide-react";
import { PuntoReportado } from "../types";
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
    emoji: "📶",
    color: "from-violet-600 to-violet-500",
    border: "border-violet-500/50",
    glow: "shadow-violet-500/25",
    ring: "ring-violet-500/40",
    bg: "bg-violet-950/60",
    textActive: "text-violet-100",
    description: "Lugares con señal WiFi gratuita o acceso a internet comunitario"
  },
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
  const [cercaDeMi, setCercaDeMi] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true); // Default expanded to show the table of elements!

  // Dragging States for Left Sidebar / Floating Panel
  const [panelPos, setPanelPos] = useState({ x: 16, y: 174 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Auth State
  const [user, setUser] = useState<{ email: string; name: string; avatar: string } | null>(null);

  // Edit Point States
  const [editingPunto, setEditingPunto] = useState<PuntoReportado | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editContacto, setEditContacto] = useState("");
  const [editAceptan, setEditAceptan] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editPercentages, setEditPercentages] = useState<Record<string, number>>({});

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
          lat: editingPunto.lat,
          lng: editingPunto.lng,
          expiresAt: editingPunto.expiresAt,
          creadoAt: editingPunto.creadoAt,
        });
    }

    // (percentages UI removed — now using main category filters)

    setEditingPunto(null);
    alert("¡Centro actualizado con éxito en tiempo real!");
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
  }, []);

  useEffect(() => {
    const loadData = async () => {
      let dbPuntos: PuntoReportado[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("reports").select("*");
        if (data && !error) {
          dbPuntos = data;
        }
      } else {
        const local = localStorage.getItem("punto_de_apoyo_puntos");
        if (local) {
          dbPuntos = JSON.parse(local).filter((p: any) => p.id !== "1" && p.id !== "2" && p.id !== "3");
          localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(dbPuntos));
        } else {
          dbPuntos = [];
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
    };
    loadData();
  }, []);

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

  const handleLocationSelected = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
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

    const nuevoPunto: PuntoReportado = {
      id: Math.random().toString(36).substr(2, 9),
      tipo: formTipo,
      categoria: formCategoria,
      descripcion: formDescripcion || `Reporte de ${formCategoria}`,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      confirmations: 0,
      creadoAt,
      expiresAt,
    };

    const updated = [nuevoPunto, ...puntos];
    setPuntos(updated);
    localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      await supabase.from("reports").insert([nuevoPunto]);
    }

    setIsReporting(false);
    setSelectedCoords(null);
    setFormDescripcion("");
    setFormDireccion("");
  };

  const filteredPuntos = puntos.filter((punto) => {
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col">
      {/* 1. Header Fijo Superior (Floating on Map, full screen friendly) */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl pointer-events-auto">
          {/* Logo / Title */}
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Punto de Apoyo</h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Crisis & Apoyo Colaborativo
              </span>
            </div>
          </div>

          {/* Navigation & Auth tabs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60 sm:min-w-[280px]">
              <button
                onClick={() => {
                  setCurrentTab("mapa");
                  setIsReporting(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentTab === "sheets" ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Desaparecidos
              </button>
            </div>

            {/* Google Authentication Widget */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 bg-slate-950/60 p-1 pl-2.5 pr-2.5 rounded-xl border border-slate-800/80">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full border border-orange-500" />
                  ) : (
                    <span className="text-[10px] text-slate-300">👤</span>
                  )}
                  <span className="text-[10px] font-bold text-slate-200 hidden md:inline">{user.name.split(" ")[0]}</span>
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
              />
            </div>

            {/* 3. Top Filter Pills — premium, horizontal, scrollable */}
            <div className="absolute top-[96px] left-0 right-0 z-20 pointer-events-none">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto px-4 scrollbar-none">
                {/* ALL button */}
                <button
                  onClick={() => setActiveMainFilter(null)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border font-bold text-xs transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer ${
                    activeMainFilter === null
                      ? "bg-white text-slate-900 border-white shadow-white/20 ring-2 ring-white/40"
                      : "bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  }`}
                >
                  <span className="text-sm">🗺️</span>
                  <span>Todo</span>
                </button>

                {MAIN_FILTERS.map((f) => {
                  const isActive = activeMainFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveMainFilter(isActive ? null : f.id)}
                      title={f.description}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-xs transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer ${
                        isActive
                          ? `bg-gradient-to-r ${f.color} ${f.border} ${f.textActive} shadow-lg ${f.glow} ring-2 ${f.ring}`
                          : `bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200`
                      }`}
                    >
                      <span className="text-sm">{f.emoji}</span>
                      <span className="whitespace-nowrap">{f.shortName}</span>
                      {isActive && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black">
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

            {/* 4. Floating Filters Card (Draggable & Collapsible Sidebar Card) */}
            <div 
              style={{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }}
              className="absolute w-[320px] z-20 pointer-events-auto select-none"
            >
              <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl flex flex-col gap-3 max-h-[60dvh] overflow-hidden">
                
                {/* Header Drag Handle & Title (Acts as grab handle) */}
                <div 
                  onMouseDown={(e) => {
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
                    const target = e.target as HTMLElement;
                    if (target.closest("button")) return;
                    const touch = e.touches[0];
                    setIsDragging(true);
                    setDragStart({
                      x: touch.clientX - panelPos.x,
                      y: touch.clientY - panelPos.y
                    });
                  }}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  className="px-4 pt-2.5 pb-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col gap-1 select-none"
                >
                  {/* Visual Pill Drag Indicator */}
                  <div className="w-10 h-1 bg-slate-700/60 rounded-full mx-auto" />
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer select-none"
                    >
                      <ListFilter className="w-3.5 h-3.5 text-orange-500" />
                      Filtros Rápidos
                      {isFiltersExpanded ? <ChevronUp className="w-3 h-3 text-orange-500" /> : <ChevronDown className="w-3 h-3 text-orange-500" />}
                    </button>

                    {userLocation && (
                      <button
                        onClick={() => setCercaDeMi(!cercaDeMi)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all border cursor-pointer ${
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
                  <div className="p-4 pt-1 flex flex-col gap-3.5 overflow-y-auto max-h-[45dvh] scrollbar-none">
                    
                    {/* Stats Comparison Card */}
                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col gap-2 shadow-inner">
                      <div className="text-[8px] font-black uppercase tracking-widest text-orange-500">
                        📊 Comparación de Monitoreo Nacional
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-[7px] text-slate-400 font-extrabold uppercase block truncate">En el Mapa</span>
                          <strong className="text-sm font-black text-sky-400">
                            {puntos.filter(p => p.fuente !== "Localizados VE").length}
                          </strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Centros activos</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-[7px] text-slate-400 font-extrabold uppercase block truncate">Ayuda por Vzla</span>
                          <strong className="text-sm font-black text-amber-500">403</strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Centros registrados</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-[7px] text-slate-400 font-extrabold uppercase block truncate">Localizados</span>
                          <strong className="text-sm font-black text-rose-500">500</strong>
                          <span className="text-[6px] text-slate-500 block leading-none">Personas encontradas</span>
                        </div>
                      </div>
                      
                      <p className="text-[8px] text-slate-400 leading-normal">
                        Nuestra app filtra y agrupa reportes del terremoto 2026. Mostramos <strong className="text-sky-400">{puntos.filter(p => p.fuente !== "Localizados VE").length} centros funcionales</strong> mapeados, de los <strong className="text-amber-500">403 centros oficiales</strong> reportados en <a href="https://ayudaparavenezuela.com/#centros" target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300">ayudaparavenezuela.com</a>.
                      </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar reportes..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                    </div>



                    {/* TTL Warning info */}
                    <div className="p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-xl flex gap-2 items-start">
                      <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        Filtro rápido: Haz clic en un elemento de la tabla. Solicitudes expiran en <strong className="text-rose-400">24h</strong> y ofrecimientos en <strong className="text-emerald-400">72h</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Bottom Float Action Buttons (Centered + Report Button) */}
            <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-20 pointer-events-none flex flex-col gap-2.5">
              
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

              {/* Main Floating Report Button */}
              <button
                onClick={() => {
                  setIsReporting(!isReporting);
                  setSelectedCoords(null);
                }}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-widest shadow-2xl transition-all duration-300 cursor-pointer pointer-events-auto ${
                  isReporting
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20"
                }`}
              >
                {isReporting ? (
                  <>
                    <AlertTriangle className="w-4 h-4 animate-pulse" />
                    Cancelar Reporte
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Reportar Punto
                  </>
                )}
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
                      <option value="energia">⚡ Energía / Electricidad</option>
                      <option value="senal">📶 Señal / Conectividad</option>
                      <option value="suministros">📦 Suministros / Agua / Alimentos</option>
                      <option value="salud">🏥 Salud / Primeros Auxilios</option>
                      <option value="peligro">⚠️ Peligro / Zonas Afectadas</option>
                      <option value="movilidad">🚗 Movilidad / Transporte</option>
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
                Cerrar (×)
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
    </main>
  );
}
