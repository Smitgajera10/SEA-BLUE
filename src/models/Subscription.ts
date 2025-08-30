// Example MongoDB schema (Mongoose)
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  location: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  lastNotifiedRisk: { type: String, default: "Low" }, // track last risk notified
});

export default mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
