// src/cron/riskScheduler.ts
import cron from "node-cron";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";
import { sendRiskEmail } from "@/utils/riskEmail";

async function checkRiskAndNotify() {
  await dbConnect();
  const users = await Subscription.find({});

  for (const user of users) {
    const { lat, lon, name: locName } = user.location;
    const res = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wind_wave_height&start_date=2025-08-29&end_date=2025-08-29&timezone=auto`);
    const data = await res.json();

    const wave = data.hourly.wave_height[0];
    const windWave = data.hourly.wind_wave_height[0];

    let risk: "Low" | "Moderate" | "High" = "Low";
    if (wave > 2.5 || windWave > 1.2) risk = "High";
    else if (wave > 1.2 || windWave > 0.6) risk = "Moderate";

    if (risk !== user.lastNotifiedRisk) {
      await sendRiskEmail(user.email, user.name, locName, wave, windWave, risk);
      user.lastNotifiedRisk = risk;
      await user.save();
    }
  }
}

// Run every 30 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Running scheduled coastal risk checks...");
  await checkRiskAndNotify();
});
