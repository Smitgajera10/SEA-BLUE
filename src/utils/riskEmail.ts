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

  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: ${risk === "High" ? "#ef4444" : risk === "Moderate" ? "#eab308" : "#16a34a"}">
        ⚠️ Coastal Risk Alert: ${risk} ⚠️
      </h2>
      <p>Hi ${name},</p>
      <p>The coastal risk at <strong>${locationName}</strong> has changed.</p>
      <ul>
        <li>Wave height: ${wave.toFixed(1)} m</li>
        <li>Wind-wave height: ${windWave.toFixed(1)} m</li>
        <li>Risk level: <strong>${risk}</strong></li>
      </ul>
      <p>Please take necessary precautions.</p>
      <hr/>
      <p style="font-size: 12px; color: #888;">This is an automated notification from Sea-Blue Dashboard.</p>
    </div>
  `;

  await transporter.sendMail({
    from: '"Sea-Blue Alerts" <alerts@sea-blue.com>',
    to: email,
    subject: `⚠️ Coastal Risk Alert at ${locationName} - ${risk}`,
    html: htmlContent,
  });
}