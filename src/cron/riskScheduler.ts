// src/cron/riskScheduler.ts
import cron from "node-cron";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";
import { sendRiskEmail } from "@/utils/riskEmail";

// --- Helper function to compute risk ---
function computeRisk(wave: number, windWave: number): "Low" | "Moderate" | "High" {
  if (wave > 2.5 || windWave > 1.2) return "High";
  if (wave > 1.2 || windWave > 0.6) return "Moderate";
  return "Low";
}

// --- Main function to check risk and notify ---
async function checkRiskAndNotify() {
  await dbConnect();
  
  // 1. Get all subscriptions to find all unique locations
  const allSubscriptions = await Subscription.find({});
  if (allSubscriptions.length === 0) {
    console.log("No active subscriptions found. Skipping risk check.");
    return;
  }
  
  // 2. Build a list of unique locations to avoid duplicate API calls
  const uniqueLocations = new Map<string, { lat: number, lon: number, name: string }>();
  for (const sub of allSubscriptions) {
    for (const loc of sub.locations) {
      const key = `${loc.lat},${loc.lon}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, loc);
      }
    }
  }

  // 3. Fetch marine data for each unique location
  const locationData = new Map<string, { wave: number; windWave: number; risk: "Low" | "Moderate" | "High" }>();
  const today = new Date().toISOString().split("T")[0];

  for (const [key, loc] of uniqueLocations.entries()) {
    try {
      const res = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.lat}&longitude=${loc.lon}&hourly=wave_height,wind_wave_height&start_date=${today}&end_date=${today}&timezone=auto`
      );
      const data = await res.json();
      
      if (data.hourly) {
        // Find the highest risk for the day
        let highestRisk: "Low" | "Moderate" | "High" = "Low";
        for (let i = 0; i < data.hourly.wave_height.length; i++) {
          const riskForHour = computeRisk(data.hourly.wave_height[i], data.hourly.wind_wave_height[i]);
          if (riskForHour === "High") {
            highestRisk = "High";
            break;
          }
          if (riskForHour === "Moderate" && highestRisk === "Low") {
            highestRisk = "Moderate";
          }
        }
        locationData.set(key, { 
          wave: data.hourly.wave_height[0], 
          windWave: data.hourly.wind_wave_height[0],
          risk: highestRisk
        });
      }
    } catch (err) {
      console.error(`Failed to fetch data for location: ${loc.name}`, err);
    }
  }

  // 4. Iterate through subscriptions and notify users based on the cached data
  for (const user of allSubscriptions) {
    for (const loc of user.locations) {
      const key = `${loc.lat},${loc.lon}`;
      const data = locationData.get(key);

      if (data && data.risk !== user.lastNotifiedRisk) {
        await sendRiskEmail(user.email, user.name, loc.name, data.wave, data.windWave, data.risk);
        // Only update the lastNotifiedRisk on the user level
        user.lastNotifiedRisk = data.risk;
        await user.save();
      }
    }
  }
}

// Run every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Running scheduled coastal risk checks...");
  await checkRiskAndNotify();
});