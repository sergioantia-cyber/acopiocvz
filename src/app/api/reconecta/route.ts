import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://www.reconectavenezuela.com/data/sites.json", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 1800 }, // Cache on Next.js server for 30 minutes (1800 seconds)
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from Reconecta Venezuela" }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
