"use client";

import { useState } from "react";

export default function AlertsPage() {
  const [form, setForm] = useState({ name: "", email: "", location: "" });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/subscribe", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    alert("✅ You will now receive alerts!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-900 text-white">
      <h1 className="text-4xl font-bold mb-6">📩 Subscribe for Coastal Alerts</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 p-6 rounded-xl shadow-lg w-96 flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="Name"
          className="p-3 rounded-lg text-black"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          className="p-3 rounded-lg text-black"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Location"
          className="p-3 rounded-lg text-black"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-yellow-400 text-black font-bold shadow-lg hover:bg-yellow-300"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
