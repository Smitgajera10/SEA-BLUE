// src/cron/riskScheduler.ts
import cron from "node-cron";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";
import { sendRiskEmail } from "@/utils/riskEmail";

async function checkRiskAndNotify() {
  await dbConnect();
  const users = await Subscription.find({});


  const today = new Date().toISOString().split("T")[0];

  for (const user of users) {
    const { lat, lon, name: locName } = user.location;
    try {
      // Fetch data using the dynamic date
      const res = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wind_wave_height&start_date=${today}&end_date=${today}&timezone=auto`
      );
      const data = await res.json();

      if (!data.hourly) {
        console.error(`No hourly data found for location: ${locName}`);
        continue;
      }

      // Find the highest risk level for the day
      let currentRisk: "Low" | "Moderate" | "High" = "Low";
      for (let i = 0; i < data.hourly.wave_height.length; i++) {
        const wave = data.hourly.wave_height[i];
        const windWave = data.hourly.wind_wave_height[i];
        
        // Re-calculate risk for each hourly data point
        if (wave > 2.5 || windWave > 1.2) {
          currentRisk = "High";
          break; // Found high risk, no need to check further
        } else if (wave > 1.2 || windWave > 0.6) {
          currentRisk = "Moderate";
        }
      }

      // Only send notification if the risk level has changed
      if (currentRisk !== user.lastNotifiedRisk) {
        // You may want to send the actual values that triggered the highest risk
        const firstWave = data.hourly.wave_height[0];
        const firstWindWave = data.hourly.wind_wave_height[0];
        await sendRiskEmail(user.email, user.name, locName, firstWave, firstWindWave, currentRisk);
        user.lastNotifiedRisk = currentRisk;
        await user.save();
      }
    } catch (err) {
      console.error(`Failed to fetch or process data for ${locName}:`, err.message);
    }
  }
}

// Run every 30 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Running scheduled coastal risk checks...");
  await checkRiskAndNotify();
});
