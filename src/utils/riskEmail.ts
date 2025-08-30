// src/utils/riskEmail.ts
import Subscription from "@/models/Subscription";
import nodemailer from "nodemailer";
import dbConnect from "../lib/dbConnect";

// Exported function for scheduler
export async function sendRiskEmail(
  email: string,
  name: string,
  locationName: string,
  wave: number,
  windWave: number,
  risk: "Low" | "Moderate" | "High"
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  let riskColor = "";
  let riskAdvice = "";
  if (risk === "High") {
    riskColor = "#ef4444";
    riskAdvice = "Please exercise extreme caution. High waves and wind-waves can be dangerous. Consider avoiding coastal activities until conditions improve.";
  } else if (risk === "Moderate") {
    riskColor = "#eab308";
    riskAdvice = "Be aware of the changing conditions. Moderate risk levels suggest that you should be cautious and monitor the situation closely.";
  } else {
    riskColor = "#16a34a";
    riskAdvice = "Current conditions are favorable. Enjoy your coastal activities, but always be aware of your surroundings.";
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: ${riskColor}; text-align: center; margin-bottom: 0;">⚠️ Coastal Risk Alert: ${risk} ⚠️</h2>
      <p style="text-align: center; color: #666; margin-top: 5px;">A change in coastal conditions has been detected.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <p>Hi <b>${name}</b>,</p>
        <p>The risk level at <b>${locationName}</b> has changed to <b>${risk}</b>.</p>
        <p>Here are the latest readings:</p>
        <ul style="list-style-type: none; padding: 0;">
          <li style="background-color: #fff; padding: 10px; margin-bottom: 5px; border-radius: 5px; border-left: 3px solid #1a73e8;">
            <b style="color: #1a73e8;">Wave Height:</b> ${wave.toFixed(1)} m
          </li>
          <li style="background-color: #fff; padding: 10px; margin-bottom: 5px; border-radius: 5px; border-left: 3px solid #1a73e8;">
            <b style="color: #1a73e8;">Wind-Wave Height:</b> ${windWave.toFixed(1)} m
          </li>
        </ul>
      </div>

      <p style="margin-top: 20px; font-style: italic; color: #555;">
        ${riskAdvice}
      </p>

      <p style="margin-top: 30px; text-align: center;">
        <a href="https://sea-blue.com/dashboard" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Full Details on the Dashboard
        </a>
      </p>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #888; text-align: center;">
        This is an automated notification from Sea-Blue Dashboard.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: '"Sea-Blue Alerts" <alerts@sea-blue.com>',
    to: email,
    subject: `⚠️ Coastal Risk Alert at ${locationName} - ${risk}`,
    html: htmlContent,
  });
}