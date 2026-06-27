import { NextResponse } from "next/server";
import { PuntoReportado } from "@/types";

const PLACE_COORDINATES: Record<string, [number, number]> = {
  "hospital-perez-carreno": [10.4725, -66.9538],
  "hospital-domingo-luciani": [10.4892, -66.8174],
  "alcaldia-de-chacao": [10.4906, -66.8533],
  "hospital-ana-francisca-perez-de-leon-2": [10.4851, -66.8117],
  "hospital-ana-francisca-perez-de": [10.4851, -66.8117],
  "clinica-el-avila": [10.4962, -66.8488],
  "hospital-jose-maria-vargas-la-guaira": [10.6012, -66.9311],
  "seguro-social-la-guaira": [10.6012, -66.9311],
  "hospital-de-pariata": [10.6005, -66.9405],
  "hospital-universitario-de-caracas": [10.4897, -66.8878],
  "hospital-del-clinico-universitario": [10.4897, -66.8878],
  "hospital-vargas-de-caracas": [10.5147, -66.9142],
  "hospital-vargas": [10.5147, -66.9142],
  "hospital-militar-universitario-dr-carlos-arvelo": [10.5058, -66.9367],
  "periferico-de-catia": [10.5239, -66.9458],
  "hospital-catia": [10.5239, -66.9458],
  "campo-de-golf-caribe-sobrevivientes-playa-los-cocos": [10.6139, -66.7844],
  "centro-de-acopio-caraballeda": [10.6111, -66.8550],
  "cruz-roja": [10.5061, -66.9025],
  
  "hospital-central-de-san-cristobal": [7.7765, -72.2155],
  "refugio-gimnasio-san-cristobal": [7.7942, -72.2033],
  "unet-acopio": [7.7905, -72.1985],
  "hospital-general-san-cristobal": [7.7667, -72.2250],
};

const mapCaracasAyudaCategory = (cat: string): PuntoReportado["categoria"] => {
  const c = cat.toLowerCase();
  if (c.includes("medico") || c.includes("medicamento")) return "salud";
  if (c.includes("carga") || c.includes("energia") || c.includes("internet")) return "energia";
  if (c.includes("peligro") || c.includes("zona")) return "peligro";
  if (c.includes("combustible") || c.includes("transporte")) return "movilidad";
  return "suministros";
};

export async function GET() {
  const reports: PuntoReportado[] = [];
  let rawLocalizados: any[] = [];

  // 1. Fetch Localizados Venezuela (Public API)
  try {
    const res = await fetch("https://localizadosvenezuela.com/api/v1/localizados?limit=500", {
      next: { revalidate: 60 },
    });
    const result = await res.json();

    if (result && result.data && Array.isArray(result.data)) {
      rawLocalizados = result.data;
      result.data.forEach((item: any, index: number) => {
        const slug = item.lugarSlug || "";
        let baseCoords = PLACE_COORDINATES[slug];
        
        if (!baseCoords) {
          const text = ((item.direccion || "") + (item.observaciones || "") + (item.lugarNombre || "")).toLowerCase();
          if (text.includes("cristobal") || text.includes("tachira") || text.includes("cucuta") || index % 5 === 0) {
            baseCoords = [7.7765, -72.2155];
          } else {
            baseCoords = [10.4806, -66.9036];
          }
        }

        const jitterLat = (Math.random() - 0.5) * 0.004;
        const jitterLng = (Math.random() - 0.5) * 0.004;
        const lat = baseCoords[0] + jitterLat;
        const lng = baseCoords[1] + jitterLng;

        reports.push({
          id: `localizados-${item.slug || index}`,
          tipo: "ofrece",
          categoria: "salud",
          descripcion: `[Localizado] ${item.nombreCompleto}. Lugar: ${item.lugarNombre}. Observaciones: ${item.observaciones || "Paciente localizado en centro médico."}`,
          lat,
          lng,
          confirmations: 3,
          creadoAt: item.publicadoEn || new Date().toISOString(),
          expiresAt: new Date(Date.now() + 120 * 3600000).toISOString(),
          fuente: "Localizados VE",
          
          nombre: item.nombreCompleto,
          direccion: item.direccion || "Sin dirección especificada.",
          contacto: item.telefono || undefined,
          aceptan: "Información / Apoyo familiar",
          region: item.lugarNombre || "Venezuela",
        });
      });
    }
  } catch (err) {
    console.error("Error fetching Localizados VE:", err);
  }

  // 2. Fetch live data from Caracas Ayuda (Querying Supabase REST Endpoint)
  try {
    const supabaseUrl = "https://zxpfumbsxgnfzxjlhocu.supabase.co";
    const supabaseKey = "sb_publishable_bx7plOxEb3M4aNID_stt-g_WPh-FS88";
    
    const res = await fetch(`${supabaseUrl}/rest/v1/puntos?select=*`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 60 },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          let waLink = undefined;
          if (item.telefono) {
            const cleanPhone = item.telefono.replace(/\D/g, "");
            if (cleanPhone.length > 0) {
              const formatted = cleanPhone.startsWith("58") ? cleanPhone : "58" + cleanPhone.replace(/^0/, "");
              waLink = `https://wa.me/${formatted}`;
            }
          }

          let regionName = "Venezuela";
          if (item.direccion) {
            const parts = item.direccion.split(",");
            regionName = parts[parts.length - 1]?.trim() || "Venezuela";
          }

          const jitterLat = (Math.random() - 0.5) * 0.0005;
          const jitterLng = (Math.random() - 0.5) * 0.0005;

          reports.push({
            id: `caracasayuda-${item.id}`,
            tipo: item.tipo === "necesidad" ? "necesita" : "ofrece",
            categoria: mapCaracasAyudaCategory(item.categoria || ""),
            descripcion: item.descripcion || `${item.nombre}. Dirección: ${item.direccion}`,
            lat: Number(item.lat) + jitterLat,
            lng: Number(item.lng) + jitterLng,
            confirmations: item.votos || 10,
            creadoAt: item.created_at || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
            fuente: "Caracas Ayuda",
            
            nombre: item.nombre,
            direccion: item.direccion || "Sin dirección cargada.",
            contacto: item.telefono || undefined,
            aceptan: item.descripcion || item.categoria || "Suministros de emergencia",
            region: regionName,
            whatsapp: waLink,
          });
        });
      }
    }
  } catch (err) {
    console.error("Error fetching live Caracas Ayuda database:", err);
  }

  // 3. Fetch live data from Ayuda por Venezuela (Querying Supabase REST Endpoint)
  try {
    const supabaseUrl = "https://yqcwttcbweqicdyfwseb.supabase.co";
    const supabaseKey = "sb_publishable_AtK5TeQlbB7N4M2o_YcaaQ_3ly_BeAQ";
    
    const res = await fetch(`${supabaseUrl}/rest/v1/help_points?select=*`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 60 },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          let waLink = undefined;
          if (item.reporter_contact) {
            const cleanPhone = item.reporter_contact.replace(/\D/g, "");
            if (cleanPhone.length > 0) {
              const formatted = cleanPhone.startsWith("58") ? cleanPhone : "58" + cleanPhone.replace(/^0/, "");
              waLink = `https://wa.me/${formatted}`;
            }
          }

          let category: PuntoReportado["categoria"] = "suministros";
          const needsList = Array.isArray(item.needs) ? item.needs : [];
          const text = needsList.join(" ").toLowerCase() + " " + (item.notes || "").toLowerCase();
          
          if (text.includes("agua") || text.includes("higiene")) {
            category = "suministros";
          } else if (text.includes("comida") || text.includes("alimento")) {
            category = "suministros";
          } else if (text.includes("luz") || text.includes("energia") || text.includes("electricidad")) {
            category = "energia";
          } else if (text.includes("medicina") || text.includes("salud") || text.includes("hospital")) {
            category = "salud";
          } else if (text.includes("senal") || text.includes("conectividad") || text.includes("internet")) {
            category = "senal";
          } else if (text.includes("peligro") || text.includes("derrumba") || text.includes("riesgo")) {
            category = "peligro";
          }

          const jitterLat = (Math.random() - 0.5) * 0.0005;
          const jitterLng = (Math.random() - 0.5) * 0.0005;

          reports.push({
            id: `ayudaporvenezuela-${item.id}`,
            tipo: "necesita",
            categoria: category,
            descripcion: item.notes || `Necesidad urgente de: ${needsList.join(', ')}`,
            lat: Number(item.latitude) + jitterLat,
            lng: Number(item.longitude) + jitterLng,
            confirmations: item.visit_count || 1,
            creadoAt: item.created_at || new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
            fuente: "Ayuda por Venezuela",
            
            nombre: item.name,
            direccion: item.address || "Sin dirección.",
            contacto: item.reporter_contact || undefined,
            aceptan: needsList.join(', '),
            region: item.city || item.state || "Venezuela",
            whatsapp: waLink,
          });
        });
      }
    }
  } catch (err) {
    console.error("Error fetching live Ayuda por Venezuela database:", err);
  }

  return NextResponse.json({ success: true, data: reports, localizadosRaw: rawLocalizados });
}
