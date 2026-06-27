"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Import CSS files directly
import "leaflet/dist/leaflet.css";
import { PuntoReportado } from "../types";

interface MapaColaborativoProps {
  puntos: PuntoReportado[];
  isReportingMode: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
  onConfirm: (id: string) => void;
  userLocation: [number, number] | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  energia: "⚡",
  senal: "📶",
  suministros: "📦",
  salud: "🏥",
  peligro: "⚠️",
  movilidad: "🚗",
};

const createCustomIcon = (tipo: "ofrece" | "necesita", categoria: string, fuente?: string) => {
  const emoji = CATEGORY_EMOJIS[categoria] || "📌";
  
  let colorClass = "";
  if (fuente) {
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
      <div class="relative flex items-center justify-center w-9 h-9 rounded-xl text-white text-lg font-semibold shadow-2xl border-2 ${colorClass} transition-transform hover:scale-115 duration-200">
        <span class="z-10">${emoji}</span>
        <span class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass} border-r-2 border-b-2"></span>
        ${fuente ? `<span class="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[8px] font-bold text-slate-300">ext</span>` : ""}
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

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
  userLocation,
}: MapaColaborativoProps) {
  const defaultCenter: [number, number] = userLocation || [10.4806, -66.9036];
  const [isMounted, setIsMounted] = useState(false);

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

        <MapClickEvents isReportingMode={isReportingMode} onLocationSelected={onLocationSelected} />

        {/* Render markers directly without clustering. 
            Overlapping points will naturally separate on zoom due to tiny coordinates offset/jittering added in the API. */}
        {puntos.map((punto) => (
          <Marker
            key={punto.id}
            position={[punto.lat, punto.lng]}
            icon={createCustomIcon(punto.tipo, punto.categoria, punto.fuente)}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
                <p className="text-slate-300 text-xs mb-3 leading-relaxed whitespace-pre-wrap">
                  {punto.descripcion}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                  {punto.fuente ? (
                    <span className="text-[10px] text-slate-500 italic">Reporte externo verificado</span>
                  ) : (
                    <>
                      <span>
                        Votos: <strong className="text-white">{punto.confirmations}</strong>
                      </span>
                      <button
                        onClick={() => onConfirm(punto.id)}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition font-medium cursor-pointer"
                      >
                        Confirmar Vigencia
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
