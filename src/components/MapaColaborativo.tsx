"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";

// Import CSS files directly
import "leaflet/dist/leaflet.css";
import { PuntoReportado } from "../types";

interface MapaColaborativoProps {
  puntos: PuntoReportado[];
  isReportingMode: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
  onConfirm: (id: string) => void;
  onEdit?: (punto: PuntoReportado) => void;
  userLocation: [number, number] | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  energia: "⚡",
  senal: "📶",
  suministros: "💙", // Matches the blue heart in the reference screenshot
  salud: "🏥",
  peligro: "⚠️",
  movilidad: "🚗",
};

const createCustomIcon = (tipo: "ofrece" | "necesita", categoria: string, fuente?: string, hasDetails?: boolean) => {
  const emoji = CATEGORY_EMOJIS[categoria] || "📌";
  
  let colorClass = "";
  if (hasDetails || categoria === "suministros") {
    colorClass = "border-sky-400 bg-sky-500 shadow-sky-500/20";
  } else if (fuente) {
    if (fuente === "Localizados VE") {
      colorClass = "border-sky-400 bg-sky-500 shadow-sky-500/20";
    } else if (fuente === "Caracas Ayuda") {
      colorClass = "border-amber-400 bg-amber-500 shadow-amber-500/20";
    } else {
      colorClass = "border-violet-400 bg-violet-500 shadow-violet-500/20";
    }
  } else {
    colorClass = tipo === "ofrece" ? "border-emerald-400 bg-emerald-500 shadow-emerald-500/20" : "border-rose-400 bg-rose-500 shadow-rose-500/20";
  }

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full text-white text-lg font-semibold shadow-2xl border-2 ${colorClass} transition-transform hover:scale-115 duration-200">
        <span class="z-10">${emoji}</span>
        <span class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass} border-r-2 border-b-2"></span>
        ${fuente && !hasDetails ? `<span class="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[8px] font-bold text-slate-300">ext</span>` : ""}
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Zoom level tracker to adjust the opacity of the electricity circles dynamically
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom());
    },
    load(e) {
      onZoomChange(e.target.getZoom());
    }
  });
  return null;
}

function MapClickEvents({
  isReportingMode,
  onLocationSelected,
}: {
  isReportingMode: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isReportingMode) {
        onLocationSelected(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function MapaColaborativo({
  puntos,
  isReportingMode,
  onLocationSelected,
  onConfirm,
  onEdit,
  userLocation,
}: MapaColaborativoProps) {
  const defaultCenter: [number, number] = userLocation || [10.4806, -66.9036];
  const [isMounted, setIsMounted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-900 text-slate-400 border-2 border-orange-500">
        Cargando Leaflet...
      </div>
    );
  }

  // Calculate opacity based on zoom: "más opaco a medida que se acerca pero que no desaparezca"
  // Zoom 7 (far): opacity 0.15 (very transparent)
  // Zoom 16 (close): opacity 0.70 (very opaque)
  const lightCircleOpacity = Math.min(0.75, Math.max(0.15, (zoomLevel - 6) * 0.06));

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-full relative rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl bg-slate-900">
      <MapContainer
        center={defaultCenter}
        zoom={userLocation ? 13 : 7}
        style={{ height: "100%", width: "100%", minHeight: "400px" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomTracker onZoomChange={setZoomLevel} />
        <MapClickEvents isReportingMode={isReportingMode} onLocationSelected={onLocationSelected} />

        {/* 1. Render electricity circles (círculo de la luz) with dynamic opacity */}
        {puntos
          .filter((punto) => punto.categoria === "energia")
          .map((punto) => (
            <Circle
              key={`light-circle-${punto.id}`}
              center={[punto.lat, punto.lng]}
              radius={350} // 350 meters coverage area
              pathOptions={{
                fillColor: "#eab308", // Yellow color
                fillOpacity: lightCircleOpacity,
                color: "#eab308", // Border
                weight: 1.5,
                opacity: Math.min(0.85, lightCircleOpacity + 0.1),
              }}
            />
          ))}

        {/* 2. Render normal markers */}
        {puntos.map((punto) => {
          const hasDetails = !!punto.nombre && !!punto.direccion;
          
          return (
            <Marker
              key={punto.id}
              position={[punto.lat, punto.lng]}
              icon={createCustomIcon(punto.tipo, punto.categoria, punto.fuente, hasDetails)}
            >
              <Popup>
                {hasDetails ? (
                  /* Premium detailed popup layout (matches MRW screenshot exactly) */
                  <div className="p-4 text-slate-100 flex flex-col gap-2.5 font-sans min-w-[290px] bg-[#111113] rounded-2xl shadow-2xl border border-slate-800/50">
                    {/* Header Pill depending on source & needs */}
                    <div className="flex">
                      {punto.fuente === "Caracas Ayuda" ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-sky-950/70 text-sky-400 border border-sky-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          📦 Centro de Acopio
                        </span>
                      ) : punto.fuente === "Ayuda por Venezuela" ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-950/70 text-rose-400 border border-rose-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          🆘 Necesita Ayuda
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          📍 Reporte: {punto.fuente || "Colaborativo"}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-black text-sky-400 tracking-wide mt-0.5 leading-tight">
                      {punto.nombre}
                    </h3>

                    {/* Address */}
                    <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                      {punto.direccion}
                    </p>

                    {/* Description / Details */}
                    {punto.descripcion && (
                      <div className="text-[11px] text-slate-300 p-2 bg-slate-950/60 rounded-xl border border-slate-900 leading-relaxed">
                        <div className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold mb-1">Detalles del punto</div>
                        <span className="font-normal">{punto.descripcion}</span>
                      </div>
                    )}

                    {/* Accepted Items */}
                    {punto.aceptan && (
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-bold text-white">{punto.tipo === "necesita" ? "Necesitan: " : "Aceptan: "}</span>
                        <span className="text-slate-300">{punto.aceptan}</span>
                      </div>
                    )}

                    {/* Contact Number */}
                    {punto.contacto && (
                      <div className="text-[11px]">
                        <span className="font-bold text-white">Contacto: </span>
                        <a 
                          href={`tel:${punto.contacto.replace(/\s+/g, "")}`} 
                          className="text-sky-400 underline font-semibold hover:text-sky-300 transition"
                        >
                          {punto.contacto}
                        </a>
                      </div>
                    )}

                    {/* Region & Source */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mt-1">
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>{punto.region || "Venezuela"}</span>
                      </div>
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider font-extrabold">{punto.fuente}</span>
                    </div>

                    {/* Action Buttons: Maps, Whatsapp & Call */}
                    <div className="flex flex-wrap gap-2 mt-2 pt-2.5 border-t border-slate-800/80">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-extrabold transition shadow-lg cursor-pointer"
                      >
                        🧭 Maps
                      </a>
                      
                      {punto.whatsapp && (
                        <a
                          href={punto.whatsapp}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 bg-[#25d366] hover:bg-[#20ba56] text-white rounded-xl text-[9px] font-extrabold transition shadow-lg cursor-pointer"
                        >
                          💬 WhatsApp
                        </a>
                      )}

                      {punto.contacto && (
                        <a
                          href={`tel:${punto.contacto.replace(/\s+/g, "")}`}
                          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[9px] font-extrabold transition border border-slate-700/50 shadow-lg cursor-pointer"
                        >
                          📞 Llamar
                        </a>
                      )}

                      {onEdit && (
                        <button
                          onClick={() => onEdit(punto)}
                          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-extrabold transition border border-orange-500/30 shadow-lg cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard community report popup layout, modernized to match premium aesthetics */
                  <div className="p-4 text-slate-100 flex flex-col gap-2 font-sans min-w-[240px] bg-[#111113] rounded-2xl">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base">{CATEGORY_EMOJIS[punto.categoria]}</span>
                      <span className="font-bold text-slate-100 text-xs capitalize">
                        {punto.categoria}
                      </span>
                      {punto.fuente ? (
                        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase">
                          {punto.fuente}
                        </span>
                      ) : (
                        <span
                          className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            punto.tipo === "ofrece"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {punto.tipo}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-300 text-xs my-1.5 leading-relaxed whitespace-pre-wrap">
                      {punto.descripcion}
                    </p>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                      {punto.fuente ? (
                        <span className="text-[10px] text-slate-500 italic">Reporte externo verificado</span>
                      ) : (
                        <>
                          <span>
                            Votos: <strong className="text-white">{punto.confirmations}</strong>
                          </span>
                          <button
                            onClick={() => onConfirm(punto.id)}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition font-medium cursor-pointer"
                          >
                            Confirmar Vigencia
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-1 flex gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition shadow-lg cursor-pointer"
                      >
                        🧭 Cómo llegar
                      </a>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(punto)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold transition shadow-lg cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
