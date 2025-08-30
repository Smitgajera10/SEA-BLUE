// src/app/api/subscribe/route.ts
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";

export async function POST(req: Request) {
  try {
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
    const newLocation = { name: locName, lat, lon };

    await dbConnect();

    // Find an existing subscription by email
    const existingSubscription = await Subscription.findOne({ email });

    if (existingSubscription) {
      // Add new location to the existing subscription if it's not already there
      const locationExists = existingSubscription.locations.some(
        (loc: any) => loc.lat === newLocation.lat && loc.lon === newLocation.lon
      );

      if (!locationExists) {
        existingSubscription.locations.push(newLocation);
        await existingSubscription.save();
      }
    } else {
      // Create a new subscription if the email is not found
      await Subscription.create({
        name,
        email,
        locations: [newLocation],
        lastNotifiedRisk: "Low",
      });
    }

    // Send welcome email
    await sendMail({
      to: email,
      subject: `Welcome to Sea-Blue, ${name}! Your coastal alerts are active.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #0d47a1; text-align: center;">🌊 Welcome to Sea-Blue!</h2>
          <p>Hello <b>${name}</b>,</p>
          <p>You have successfully subscribed to coastal alerts for <b>${locName}</b>. We are excited to help you stay safe and informed about coastal conditions.</p>
          <p>Our system provides real-time monitoring and alerts for wave height and wind-wave height to help you assess coastal risks.</p>
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><b>Subscribed Location</b></td>
              <td style="padding: 10px; border: 1px solid #eee;">${locName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><b>Alerts for</b></td>
              <td style="padding: 10px; border: 1px solid #eee;">Wave & Wind-Wave Height</td>
            </tr>
          </table>
          <p style="margin-top: 20px; text-align: center;">
            <a href="https://sea-blue.com/dashboard" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Explore the Dashboard
            </a>
          </p>
          <p style="font-size: 12px; color: #888; margin-top: 20px; text-align: center;">
            You will receive a notification whenever the risk level changes. Stay safe!
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Subscription successful!" });
  } catch (error) {
    console.error("Subscription API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
  }
}