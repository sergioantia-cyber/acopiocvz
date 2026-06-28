import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Revalidate every 60 seconds (real-time alerts)
export const revalidate = 60;

export async function GET() {
  const manualAlerts: any[] = [];
  const seismicAlerts: any[] = [];

  // 1. Fetch Manual Active Alerts from Supabase (or fallback)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("critical_alerts")
        .select("*")
        .eq("activo", true)
        .order("creado_at", { ascending: false });

      if (!error && data) {
        manualAlerts.push(...data);
      }
    } catch (err) {
      console.error("Error fetching manual alerts:", err);
    }
  }

  // 2. Fetch Real-time Seismological Alerts from USGS (Venezuela bounds)
  try {
    // We look for earthquakes in Venezuela bounds in the last 48 hours
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    
    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=1&maxlatitude=13&minlongitude=-73&maxlongitude=-59&starttime=${fortyEightHoursAgo}&minmagnitude=3.5&limit=10`;
    
    const res = await fetch(usgsUrl, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && Array.isArray(data.features)) {
        data.features.forEach((f: any) => {
          const props = f.properties;
          const mag = props.mag;
          const place = props.place || "Lugar Desconocido";
          const time = new Date(props.time).toLocaleString("es-VE", { timeZone: "America/Caracas" });
          
          const coords = f.geometry?.coordinates || [];
          seismicAlerts.push({
            id: f.id,
            mensaje: `🚨 SISMO: Magnitud ${mag} Mws – ${place} a las ${time}.`,
            tipo: "sismo",
            activo: true,
            creado_at: new Date(props.time).toISOString(),
            mag,
            depth: coords[2] ?? null,
            lat: coords[1] ?? null,
            lng: coords[0] ?? null,
            place,
            url: props.url || null,
          });
        });
      }
    }
  } catch (err) {
    console.error("Error fetching seismological alerts:", err);
  }

  return NextResponse.json({
    manual: manualAlerts,
    seismic: seismicAlerts
  });
}
