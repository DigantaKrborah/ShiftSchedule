"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormState {
  name: string;
  personsPerShift: number;
  shiftsPerDay: number;
  weeklyOffDays: number;
  minRestHours: number;
  maxConsecutiveWorkDays: number;
  minConsecutiveWorkDays: number;
}

export default function NewUnitPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create unit");
      }
      const unit = await res.json();
      router.push(`/units/${unit.id}/schedule`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSaving(false);
    }
  }

  function setNum(key: keyof FormState, val: string) {
    setForm((f) => ({ ...f, [key]: Number(val) }));
  }

  return (
    <div className="max-w-lg">
      <div className="mb-5">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Units
        </Link>
        <h1 className="text-2xl font-bold mt-2">New Unit</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. ICU North"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["personsPerShift", "Persons / Shift", 1],
              ["shiftsPerDay", "Shifts / Day", 1],
              ["weeklyOffDays", "Off Days / Week", 0],
              ["minRestHours", "Min Rest Hours", 0],
              ["maxConsecutiveWorkDays", "Max Consecutive Work Days", 1],
              ["minConsecutiveWorkDays", "Min Consecutive Work Days", 1],
            ] as [keyof FormState, string, number][]
          ).map(([key, label, min]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="number"
                min={min}
                value={form[key]}
                onChange={(e) => setNum(key, e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create Unit"}
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
