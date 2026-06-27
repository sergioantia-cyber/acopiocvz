import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import Leaflet & MarkerCluster styles globally
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Punto de Apoyo - Mapa Colaborativo de Emergencias en Tiempo Real",
  description:
    "Plataforma móvil y colaborativa en tiempo real para reportar necesidades y ofertas de ayuda de forma 100% anónima y geolocalizada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
