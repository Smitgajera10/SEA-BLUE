"use client";

import { useState } from "react";
import {
  MapPin,
  Trash2,
  Bell,
  Mail,
  Loader2,
  Check,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

type Location = {
  name: string;
  lat: number;
  lon: number;
};

export default function AlertsPage() {
  const [form, setForm] = useState({ name: "", email: "", location: "" });
  const [viewEmail, setViewEmail] = useState("");
  const [subscriptions, setSubscriptions] = useState<Location[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/subscribe", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    alert("✅ You will now receive alerts!");
    setForm({ name: "", email: "", location: "" });
  };

  const handleFetchSubscriptions = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/subscriptions/${viewEmail}`);
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data.subscriptions);
      } else {
        setFetchError(data.error || "Failed to fetch subscriptions.");
        setSubscriptions([]);
      }
    } catch (err) {
      console.error("Fetch subscriptions error:", err);
      setFetchError("An unexpected error occurred. Please try again.");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (lat: number, lon: number) => {
    if (!confirm("Are you sure you want to remove this location?")) return;
    try {
      const res = await fetch(`/api/subscriptions/${viewEmail}`, {
        method: "DELETE",
        body: JSON.stringify({ lat, lon }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        // Optimistically update the UI
        setSubscriptions(
          subscriptions!.filter((loc) => loc.lat !== lat || loc.lon !== lon)
        );
      } else {
        alert("❌ Failed to delete location.");
      }
    } catch (err) {
      console.error("Delete location error:", err);
      alert("❌ An unexpected error occurred while deleting.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-900 text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">📩 Coastal Alerts</h1>
          <p className="text-lg text-blue-200">
            Subscribe or manage your existing alerts.
          </p>
        </div>

        {/* Subscribe Section */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/10 p-6 rounded-xl shadow-lg w-full flex flex-col gap-4 border border-white/20"
        >
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Bell size={20} /> New Subscription
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your Name"
              className="p-3 rounded-lg text-black bg-white/90"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              className="p-3 rounded-lg text-black bg-white/90"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Location (e.g., Mumbai)"
              className="p-3 rounded-lg text-black bg-white/90"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-yellow-400 text-black font-bold shadow-lg hover:bg-yellow-300 transition-all"
            >
              Subscribe
            </button>
          </form>
        </motion.div>

        {/* Manage Subscriptions Section */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/10 p-6 rounded-xl shadow-lg w-full flex flex-col gap-4 border border-white/20"
        >
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Mail size={20} /> Manage Subscriptions
          </div>
          <form onSubmit={handleFetchSubscriptions} className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email to view"
              className="p-3 flex-1 rounded-lg text-black bg-white/90"
              value={viewEmail}
              onChange={(e) => setViewEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Check />}
            </button>
          </form>

          {/* Display Subscriptions */}
          {subscriptions && (
            <div className="mt-4">
              <h3 className="text-white font-semibold mb-2">
                Your Subscribed Locations:
              </h3>
              {subscriptions.length > 0 ? (
                <ul className="space-y-2">
                  {subscriptions.map((loc, index) => (
                    <motion.li
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-white/20 rounded-lg backdrop-blur-sm"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={16} /> {loc.name}
                      </span>
                      <button
                        onClick={() => handleDeleteLocation(loc.lat, loc.lon)}
                        className="p-1 rounded-full text-red-300 hover:text-red-500 hover:bg-red-100/20 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-red-200">
                  <XCircle size={18} /> No subscriptions found for this email.
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}