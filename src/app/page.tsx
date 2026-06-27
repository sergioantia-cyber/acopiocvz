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

const MOCK_PUNTOS: PuntoReportado[] = [
  {
    id: "1",
    tipo: "ofrece",
    categoria: "energia",
    descripcion: "Tengo planta eléctrica de 5kW encendida para cargar teléfonos en el porche.",
    lat: 10.4806,
    lng: -66.9036,
    confirmations: 12,
    creadoAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 70 * 3600000).toISOString(),
  },
  {
    id: "2",
    tipo: "necesita",
    categoria: "salud",
    descripcion: "Se necesita insulina urgente para adulto mayor en condiciones críticas.",
    lat: 10.4856,
    lng: -66.8986,
    confirmations: 24,
    creadoAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  },
  {
    id: "3",
    tipo: "ofrece",
    categoria: "suministros",
    descripcion: "Distribución de agua potable gratuita.",
    lat: 10.4786,
    lng: -66.9086,
    confirmations: 8,
    creadoAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 68 * 3600000).toISOString(),
  },
];

const MOCK_PERSONS = [
  { id: "1", nombre: "Carlos Mendoza", edad: 45, estado: "Encontrado - Estable", ubicacion: "Clínica Caracas", contacto: "0412-5551234" },
  { id: "2", nombre: "María Gabriela Silva", edad: 28, estado: "Buscando", ubicacion: "Chacao, Av. Francisco de Miranda", contacto: "0424-9998877" },
  { id: "3", nombre: "José Gregorio Rivas", edad: 62, estado: "Herido Leve", ubicacion: "Hospital Domingo Luciani", contacto: "0416-2223344" },
];

const PERIODIC_ELEMENTS = [
  { symbol: "Ag", name: "Agua", emoji: "💧", category: "suministros", atomicNumber: 1, percentage: 68, barColor: "bg-sky-500" },
  { symbol: "Al", name: "Alimentos", emoji: "🍲", category: "suministros", atomicNumber: 2, percentage: 45, barColor: "bg-amber-500" },
  { symbol: "El", name: "Electricidad", emoji: "⚡", category: "energia", atomicNumber: 3, percentage: 22, barColor: "bg-yellow-400" },
  { symbol: "Co", name: "Conectividad", emoji: "📶", category: "senal", atomicNumber: 4, percentage: 51, barColor: "bg-indigo-500" },
  { symbol: "Me", name: "Medicinas", emoji: "💊", category: "salud", atomicNumber: 5, percentage: 30, barColor: "bg-rose-500" },
  { symbol: "Cm", name: "Camas / Refugio", emoji: "🛏️", category: "suministros", atomicNumber: 6, percentage: 40, barColor: "bg-emerald-500" },
  { symbol: "Tr", name: "Transporte", emoji: "🚗", category: "movilidad", atomicNumber: 7, percentage: 58, barColor: "bg-teal-500" },
  { symbol: "Pe", name: "Alertas", emoji: "⚠️", category: "peligro", atomicNumber: 8, percentage: 87, barColor: "bg-red-600" },
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
  const [cercaDeMi, setCercaDeMi] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true); // Default expanded to show the table of elements!

  // Form State
  const [formTipo, setFormTipo] = useState<"ofrece" | "necesita">("ofrece");
  const [formCategoria, setFormCategoria] = useState<PuntoReportado["categoria"]>("suministros");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formDireccion, setFormDireccion] = useState("");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

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
          dbPuntos = JSON.parse(local);
        } else {
          dbPuntos = MOCK_PUNTOS;
          localStorage.setItem("punto_de_apoyo_puntos", JSON.stringify(MOCK_PUNTOS));
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
    // Expiration check
    if (new Date(punto.expiresAt).getTime() < Date.now()) {
      return false;
    }

    // Periodic Table Element Filter
    if (selectedElement) {
      const desc = (punto.descripcion || "").toLowerCase() + " " + (punto.nombre || "").toLowerCase() + " " + (punto.aceptan || "").toLowerCase();
      
      switch (selectedElement) {
        case "Ag": // Agua
          if (punto.categoria !== "suministros" || (!desc.includes("agua") && !desc.includes("potable") && !desc.includes("hidra") && !desc.includes("comida") && !desc.includes("alimento") && !desc.includes("acopio"))) return false;
          // Let's make sure it is related to water
          if (!desc.includes("agua") && !desc.includes("potable") && !desc.includes("botell") && !desc.includes("recip")) return false;
          break;
        case "Al": // Alimentos
          if (punto.categoria !== "suministros" || (!desc.includes("aliment") && !desc.includes("comida") && !desc.includes("nutri") && !desc.includes("cena") && !desc.includes("seco"))) return false;
          break;
        case "El": // Electricidad
          if (punto.categoria !== "energia") return false;
          break;
        case "Co": // Conectividad / Señal
          if (punto.categoria !== "senal") return false;
          break;
        case "Me": // Medicinas
          if (punto.categoria !== "salud") return false;
          break;
        case "Cm": // Camas / Refugio
          if (punto.categoria !== "suministros" || (!desc.includes("cama") && !desc.includes("refugio") && !desc.includes("albergue") && !desc.includes("colchon") && !desc.includes("dormir"))) return false;
          break;
        case "Tr": // Transporte
          if (punto.categoria !== "movilidad") return false;
          break;
        case "Pe": // Alertas
          if (punto.categoria !== "peligro") return false;
          break;
      }
    } else {
      // Standard dropdown filters
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

          {/* Navigation tabs */}
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
                userLocation={userLocation}
              />
            </div>

            {/* 3. Floating Filters Card (Responsive Left Panel / Top Overlays) */}
            <div className="absolute top-28 left-4 right-4 sm:right-auto sm:w-[360px] z-20 pointer-events-none">
              <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 pointer-events-auto max-h-[60dvh] overflow-y-auto">
                
                {/* Header of Filters */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ListFilter className="w-3.5 h-3.5 text-orange-500" />
                    Filtros Rápidos
                    {isFiltersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {userLocation && (
                    <button
                      onClick={() => setCercaDeMi(!cercaDeMi)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all border cursor-pointer ${
                        cercaDeMi
                          ? "bg-orange-500/15 border-orange-500 text-orange-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Cerca de mí (5 km)
                    </button>
                  )}
                </div>

                {/* Collapsible search and detailed filters */}
                {(isFiltersExpanded || true) && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-200">
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

                    {/* Periodic Table of Emergency Elements */}
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          Tabla Periódica de Recursos
                        </label>
                        {selectedElement && (
                          <button
                            onClick={() => setSelectedElement(null)}
                            className="text-[9px] font-extrabold text-orange-500 uppercase tracking-wider hover:text-orange-400 cursor-pointer"
                          >
                            Limpiar Filtro (×)
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {PERIODIC_ELEMENTS.map((el) => {
                          const isSelected = selectedElement === el.symbol;
                          return (
                            <button
                              key={el.symbol}
                              onClick={() => setSelectedElement(isSelected ? null : el.symbol)}
                              className={`relative flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10 scale-105"
                                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              {/* Atomic Number */}
                              <span className="absolute top-1 left-1.5 text-[7px] text-slate-500 font-bold">
                                {el.atomicNumber}
                              </span>

                              {/* Emoji */}
                              <span className="text-xs mt-1">{el.emoji}</span>

                              {/* Symbol */}
                              <span className="text-[11px] font-black tracking-wider uppercase mt-0.5 leading-none">
                                {el.symbol}
                              </span>

                              {/* Name */}
                              <span className="text-[7px] text-slate-400 font-bold truncate max-w-full leading-none mt-1">
                                {el.name}
                              </span>

                              {/* Mini Progress Bar */}
                              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-800/40">
                                <div
                                  style={{ width: `${el.percentage}%` }}
                                  className={`h-full rounded-full ${el.barColor}`}
                                />
                              </div>

                              {/* Percentage Label */}
                              <span className="text-[7px] text-slate-500 font-extrabold mt-0.5">
                                {el.percentage}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
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
                        p.observaciones?.toLowerCase().includes(q)
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
                          p.observaciones?.toLowerCase().includes(q)
                        );
                      })
                      .map((person, index) => {
                        const cond = person.condicion || "desconocido";
                        const stateText = cond === "vivo" ? "Localizado - Vivo" : cond === "fallecido" ? "Fallecido" : "En Observación";
                        const badgeColor = cond === "vivo" ? "bg-emerald-500/10 text-emerald-400" : cond === "fallecido" ? "bg-rose-500/10 text-rose-400" : "bg-sky-500/10 text-sky-400";
                        return (
                          <tr key={person.slug || index} className="hover:bg-slate-900/30 transition">
                            <td className="p-3.5 font-bold text-white">{person.nombreCompleto}</td>
                            <td className="p-3.5 text-slate-400">{person.edad ? `${person.edad} años` : "S/I"}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${badgeColor}`}>
                                {stateText}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300">
                              <div className="font-medium">{person.lugarNombre || "Sin Centro"}</div>
                              {person.direccion && <div className="text-[10px] text-slate-500 mt-0.5">{person.direccion}</div>}
                            </td>
                            <td className="p-3.5 text-slate-400 max-w-xs truncate" title={person.observaciones}>
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
    </main>
  );
}
