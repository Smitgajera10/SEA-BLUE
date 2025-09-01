import { NextResponse } from "next/server";
import { checkRiskAndNotify } from "@/cron/riskScheduler";

export async function GET() {
  try {
    await checkRiskAndNotify();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Cron failed:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
