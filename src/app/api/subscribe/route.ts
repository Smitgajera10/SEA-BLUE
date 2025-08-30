import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";

export async function POST(req: Request) {
  const { name, email, location } = await req.json();

  if (!location || typeof location !== "string") {
    return NextResponse.json({ error: "Location name is required." }, { status: 400 });
  }

  // Geocode location name to lat/lon
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();

  if (!geoData.results || geoData.results.length === 0) {
    return NextResponse.json({ error: "Could not find coordinates for the given location." }, { status: 400 });
  }

  const { name: locName, latitude: lat, longitude: lon } = geoData.results[0];

  await dbConnect();

  // Save new subscriber to MongoDB
  await Subscription.create({
    name,
    email,
    location: {
      name: locName,
      lat,
      lon,
    },
    lastNotifiedRisk: "Low",
  });

  // Send welcome email
  await sendMail({
    to: email,
    subject: "🌊 Coastal Alert Subscription",
    html: `<p>Hello <b>${name}</b>,</p>
           <p>You are now subscribed to coastal alerts for <b>${locName}</b>. Stay safe!</p>
           <p>You'll receive notifications when risk levels rise.</p>`,
  });

  return NextResponse.json({ success: true });
}