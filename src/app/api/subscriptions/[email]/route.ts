import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.pathname.split("/").pop(); // Extract email from URL

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await dbConnect();
    const subscription = await Subscription.findOne({ email });

    if (!subscription) {
      return NextResponse.json({ subscriptions: [] }); // Return empty array if no subscription found
    }

    return NextResponse.json({ subscriptions: subscription.locations });
  } catch (error) {
    console.error("GET subscriptions API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

// Handler for DELETE requests to remove a location
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.pathname.split("/").pop(); // Extract email
    const { lat, lon } = await req.json();

    if (!email || !lat || !lon) {
      return NextResponse.json({ error: "Email and location coordinates are required." }, { status: 400 });
    }

    await dbConnect();

    const subscription = await Subscription.findOne({ email });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    // Filter out the location to be deleted
    const updatedLocations = subscription.locations.filter(
      (loc: any) => loc.lat !== lat || loc.lon !== lon
    );

    // If the last location is deleted, remove the entire subscription
    if (updatedLocations.length === 0) {
      await Subscription.deleteOne({ email });
    } else {
      subscription.locations = updatedLocations;
      await subscription.save();
    }

    return NextResponse.json({ success: true, message: "Location removed successfully." });
  } catch (error) {
    console.error("DELETE subscription API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}