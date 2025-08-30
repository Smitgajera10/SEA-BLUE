import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET() {
  const jsonDirectory = path.join(process.cwd(), "public");
  try {
    const fileContents = await fs.readFile(
      jsonDirectory + "/coastal_events_last24h.json",
      "utf8"
    );
    const events = JSON.parse(fileContents);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to read coastal events file:", error);
    return NextResponse.json(
      { error: "Could not fetch coastal events." },
      { status: 500 }
    );
  }
}