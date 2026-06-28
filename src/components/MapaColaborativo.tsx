"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

// Import CSS files directly
import "leaflet/dist/leaflet.css";
import { PuntoReportado } from "../types";

// Categories that the owner is allowed to drag
const DRAGGABLE_CATEGORIES = new Set(["acopio", "salud", "senal", "suministros"]);

interface MapaColaborativoProps {
  puntos: PuntoReportado[];
  isReportingMode: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
  onConfirm: (id: string) => void;
  onEdit?: (punto: PuntoReportado) => void;
  userLocation: [number, number] | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkerMove?: (id: string, lat: number, lng: number, prevLat: number, prevLng: number) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  energia: "⚡",
  senal: "📶",
  suministros: "💙",
  salud: "🏥",
  peligro: "⚠️",
  movilidad: "🚗",
  sismo: "💥",
};

const createCustomIcon = (punto: PuntoReportado, isDraggingThis = false) => {
  const emoji = CATEGORY_EMOJIS[punto.categoria] || "📌";

  let colorClass = "";
  if (punto.categoria === "sismo") {
    colorClass = "border-rose-600 bg-rose-700 shadow-rose-500/60 animate-pulse scale-105";
  } else if (punto.aprobado === false) {
    colorClass = "border-amber-500 bg-amber-600/80 shadow-amber-500/50 animate-pulse";
  } else if (punto.nombre || punto.categoria === "suministros") {
    colorClass = "border-sky-400 bg-sky-500 shadow-sky-500/20";
  } else if (punto.fuente) {
    if (punto.fuente === "Localizados VE") {
      colorClass = "border-sky-400 bg-sky-500 shadow-sky-500/20";
    } else if (punto.fuente === "Caracas Ayuda") {
      colorClass = "border-amber-400 bg-amber-500 shadow-amber-500/20";
    } else {
      colorClass = "border-violet-400 bg-violet-500 shadow-violet-500/20";
    }
  } else {
    colorClass =
      punto.tipo === "ofrece"
        ? "border-emerald-400 bg-emerald-500 shadow-emerald-500/20"
        : "border-rose-400 bg-rose-500 shadow-rose-500/20";
  }

  const isExt = punto.fuente && !punto.nombre;
  // Show drag cursor ring when being dragged
  const dragRing = isDraggingThis
    ? " ring-4 ring-orange-400 ring-offset-1 ring-offset-slate-900 scale-125"
    : "";

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full text-white text-lg font-semibold shadow-2xl border-2 ${colorClass}${dragRing} transition-transform hover:scale-115 duration-200" style="${isDraggingThis ? "cursor:grabbing !important;" : "cursor:grab !important;"}pointer-events:all">
        <span class="z-10" style="pointer-events:none">${emoji}</span>
        <span class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass} border-r-2 border-b-2" style="pointer-events:none"></span>
        ${isExt ? `<span class="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[8px] font-bold text-slate-300" style="pointer-events:none">ext</span>` : ""}
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// ─── Inner component: locks/unlocks map panning during marker drag ───────────
function MapDragLock({ locked }: { locked: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (locked) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
    }
  }, [locked, map]);
  return null;
}

// ─── Zoom tracker ─────────────────────────────────────────────────────────────
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend(e) { onZoomChange(e.target.getZoom()); },
    load(e)    { onZoomChange(e.target.getZoom()); },
  });
  return null;
}

// ─── Map click events ─────────────────────────────────────────────────────────
function MapClickEvents({
  isReportingMode,
  onLocationSelected,
}: {
  isReportingMode: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isReportingMode) onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapaColaborativo({
  puntos,
  isReportingMode,
  onLocationSelected,
  onConfirm,
  onEdit,
  userLocation,
  isAdmin = false,
  isOwner = false,
  onApprove,
  onDelete,
  onMarkerMove,
}: MapaColaborativoProps) {
  const defaultCenter: [number, number] = userLocation || [10.4806, -66.9036];
  const [isMounted, setIsMounted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mapLocked, setMapLocked] = useState(false);
  const [moveToast, setMoveToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const startLongPress = (id: string) => {
    if (!isOwner) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      setMapLocked(true);
      setDraggingId(id);
      
      // Haptic vibration feedback for mobile devices (50ms)
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate(50);
        } catch (err) {}
      }
    }, 550); // 550ms hold threshold
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showToast = (msg: string) => {
    setMoveToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setMoveToast(null), 3500);
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-900 text-slate-400 border-2 border-orange-500">
        Cargando Leaflet...
      </div>
    );
  }

  const lightCircleOpacity = Math.min(0.75, Math.max(0.15, (zoomLevel - 6) * 0.06));

  // Only owner can drag, and they are always draggable to prevent React recreation/unmount bugs
  const isDraggablePunto = (p: PuntoReportado) =>
    isOwner && DRAGGABLE_CATEGORIES.has(p.categoria) && p.categoria !== "sismo";

  const renderMarker = (punto: PuntoReportado) => {
    const hasDetails = !!punto.nombre && !!punto.direccion;
    const canDrag = isDraggablePunto(punto);
    const isDraggingThis = draggingId === punto.id;

    return (
      <Marker
        key={punto.id} // Keep constant key to avoid losing touch gesture on dynamic update
        position={[punto.lat, punto.lng]}
        icon={createCustomIcon(punto, isDraggingThis)}
        draggable={canDrag}
        eventHandlers={{
          add: (e) => {
            const marker = e.target;
            const el = marker.getElement();
            if (el) {
              el.addEventListener("touchstart", () => startLongPress(punto.id), { passive: true });
              el.addEventListener("touchend", cancelLongPress, { passive: true });
              el.addEventListener("touchmove", () => {
                if (!mapLocked) cancelLongPress();
              }, { passive: true });
            }
          },
          mousedown: () => {
            startLongPress(punto.id);
          },
          mouseup: () => {
            cancelLongPress();
          },
          mousemove: () => {
            if (!mapLocked) cancelLongPress();
          },
          dragstart: () => {
            setDraggingId(punto.id);
            setMapLocked(true);   // ← freeze map so it doesn't pan
          },
          dragend: (e) => {
            setDraggingId(null);
            setMapLocked(false);  // ← unfreeze map
            cancelLongPress();
            const marker = e.target;
            const newPos = marker.getLatLng();
            const prevLat = punto.lat;
            const prevLng = punto.lng;
            if (
              Math.abs(newPos.lat - prevLat) > 0.000005 ||
              Math.abs(newPos.lng - prevLng) > 0.000005
            ) {
              onMarkerMove?.(punto.id, newPos.lat, newPos.lng, prevLat, prevLng);
              showToast(`📍 "${punto.nombre || punto.categoria}" movido · Ctrl+Z para deshacer`);
            }
          },
        }}
      >
        {/* Full popup — shown for every marker */}
        <Popup>
          {/* Owner drag hint strip */}
          {canDrag && (
            <div className="flex items-center gap-1.5 bg-orange-950/60 border border-orange-700/40 rounded-lg px-2 py-1 mb-2">
              <span className="text-sm">🖱️</span>
              <span className="text-[9px] font-extrabold text-orange-300 uppercase tracking-wider">
                Arrastra para mover · Ctrl+Z deshace
              </span>
            </div>
          )}

          {hasDetails ? (
            /* Premium detailed popup */
            <div className="p-4 text-slate-100 flex flex-col gap-2.5 font-sans min-w-[290px] bg-[#111113] rounded-2xl shadow-2xl border border-slate-800/50">
              <div className="flex items-center gap-2 flex-wrap">
                {punto.aprobado === false && (
                  <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-amber-500/25 animate-pulse">
                    ⚠️ Pendiente de Aprobación
                  </span>
                )}
                {punto.fuente === "Caracas Ayuda" ? (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-sky-950/70 text-sky-400 border border-sky-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    📦 Centro de Acopio
                  </span>
                ) : punto.fuente === "Ayuda por Venezuela" ? (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-950/70 text-rose-400 border border-rose-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    🆘 Necesita Ayuda
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    📍 Reporte: {punto.fuente || "Colaborativo"}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-black text-sky-400 tracking-wide mt-0.5 leading-tight">
                {punto.nombre}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                {punto.direccion}
              </p>

              {punto.descripcion && (
                <div className="text-[11px] text-slate-300 p-2 bg-slate-950/60 rounded-xl border border-slate-900 leading-relaxed">
                  <div className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold mb-1">
                    Detalles del punto
                  </div>
                  <span className="font-normal">{punto.descripcion}</span>
                </div>
              )}

              {punto.aceptan && (
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-white">
                    {punto.tipo === "necesita" ? "Necesitan: " : "Aceptan: "}
                  </span>
                  <span className="text-slate-300">{punto.aceptan}</span>
                </div>
              )}

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

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mt-1">
                <div className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{punto.region || "Venezuela"}</span>
                </div>
                <span className="text-[8px] text-slate-500 uppercase tracking-wider font-extrabold">
                  {punto.fuente}
                </span>
              </div>

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

                {onEdit && punto.aprobado !== false && (
                  <button
                    onClick={() => onEdit(punto)}
                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-extrabold transition border border-orange-500/30 shadow-lg cursor-pointer"
                  >
                    ✏️ Editar
                  </button>
                )}

                {isAdmin && punto.aprobado === false && (
                  <div className="w-full flex gap-2 mt-1.5">
                    {onApprove && (
                      <button
                        onClick={() => onApprove(punto.id)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-extrabold transition shadow-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        ✅ Aprobar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(punto.id)}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-extrabold transition shadow-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        ❌ Rechazar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard community report popup */
            <div className="p-4 text-slate-100 flex flex-col gap-2 font-sans min-w-[240px] bg-[#111113] rounded-2xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                {punto.aprobado === false && (
                  <span className="text-[8px] font-black uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg shadow-amber-500/25 animate-pulse">
                    ⚠️ Pendiente
                  </span>
                )}
                <span className="text-base">{CATEGORY_EMOJIS[punto.categoria]}</span>
                <span className="font-bold text-slate-100 text-xs capitalize font-sans">
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
                  <span className="text-[10px] text-slate-500 italic">
                    Reporte externo verificado
                  </span>
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
                {onEdit && punto.aprobado !== false && (
                  <button
                    onClick={() => onEdit(punto)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold transition shadow-lg cursor-pointer"
                  >
                    ✏️ Editar
                  </button>
                )}
                {isAdmin && punto.aprobado === false && (
                  <div className="w-full flex gap-2 mt-1.5">
                    {onApprove && (
                      <button
                        onClick={() => onApprove(punto.id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-bold transition shadow-lg cursor-pointer"
                      >
                        Aprobar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(punto.id)}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-bold transition shadow-lg cursor-pointer"
                      >
                        Rechazar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Popup>
      </Marker>
    );
  };

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-full relative rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl bg-slate-900">
      {/* Owner drag mode hint banner */}
      {isOwner && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-orange-500/40 text-orange-300 text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg shadow-orange-500/10">
            <span>🖱️</span>
            <span>Dueño — Deja presionado un marcador para moverlo · Ctrl+Z deshace</span>
          </div>
        </div>
      )}

      {/* Map-locked overlay visual cue */}
      {mapLocked && (
        <div className="absolute inset-0 z-[499] pointer-events-none border-4 border-orange-400/60 rounded-2xl" />
      )}

      {/* Move toast notification */}
      {moveToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-4 py-2 rounded-full shadow-xl shadow-emerald-500/10">
            {moveToast}
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={userLocation ? 13 : 7}
        style={{ height: "100%", width: "100%", minHeight: "400px" }}
        zoomControl={false}
        preferCanvas={true}
      >
        {/* Locks map panning while a marker is being dragged */}
        <MapDragLock locked={mapLocked} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomTracker onZoomChange={setZoomLevel} />
        <MapClickEvents isReportingMode={isReportingMode} onLocationSelected={onLocationSelected} />

        {/* 1. Electricity coverage circles */}
        {puntos
          .filter((p) => p.categoria === "energia")
          .map((p) => (
            <Circle
              key={`light-circle-${p.id}`}
              center={[p.lat, p.lng]}
              radius={350}
              pathOptions={{
                fillColor: "#eab308",
                fillOpacity: lightCircleOpacity,
                color: "#eab308",
                weight: 1.5,
                opacity: Math.min(0.85, lightCircleOpacity + 0.1),
              }}
            />
          ))}

        {/* 2. Normal markers with clustering (only when not being dragged) */}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {puntos
            .filter((p) => p.categoria !== "sismo" && !isDraggablePunto(p))
            .map((p) => renderMarker(p))}
        </MarkerClusterGroup>

        {/* 2.5. Render active draggable markers outside of the cluster group for native dragging support */}
        {puntos
          .filter((p) => p.categoria !== "sismo" && isDraggablePunto(p))
          .map((p) => renderMarker(p))}

        {/* 3. Sismo markers — unclustered, always visible */}
        {puntos
          .filter((p) => p.categoria === "sismo")
          .map((p) => renderMarker(p))}
      </MapContainer>
    </div>
  );
}
