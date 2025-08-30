import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) return NextResponse.json({ error: "Missing coordinates" });

  const today = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wind_wave_height,swell_wave_height&start_date=${today}&end_date=${today}&timezone=auto`
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch marine data" });
  }
}
