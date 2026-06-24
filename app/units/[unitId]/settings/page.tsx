"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface UnitForm {
  name: string;
  personsPerShift: number;
  shiftsPerDay: number;
  weeklyOffDays: number;
  minRestHours: number;
  maxConsecutiveWorkDays: number;
  minConsecutiveWorkDays: number;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params.unitId as string;

  const [form, setForm] = useState<UnitForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/units/${unitId}`)
      .then((r) => r.json())
      .then((data) =>
        setForm({
          name: data.name,
          personsPerShift: data.personsPerShift,
          shiftsPerDay: data.shiftsPerDay,
          weeklyOffDays: data.weeklyOffDays,
          minRestHours: data.minRestHours,
          maxConsecutiveWorkDays: data.maxConsecutiveWorkDays,
          minConsecutiveWorkDays: data.minConsecutiveWorkDays,
        })
      );
  }, [unitId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Delete this unit and ALL its employees, schedule entries, and leave requests? This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      setDeleting(false);
      setError("Delete failed");
    }
  }

  if (!form)
    return (
      <div className="text-gray-400 py-8 text-sm">Loading settings…</div>
    );

  function setNum(key: keyof UnitForm, val: string) {
    setForm((f) => f && { ...f, [key]: Number(val) });
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm mb-6">
        <p className="font-semibold text-gray-800">Unit Settings</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
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
            ] as [keyof UnitForm, string, number][]
          ).map(([key, label, min]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
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

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {saved && (
          <p className="text-green-700 text-sm">Settings saved.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-50">
        <p className="font-semibold text-red-800 text-sm mb-1">Danger Zone</p>
        <p className="text-sm text-red-600 mb-3">
          Deleting this unit removes all employees, schedule entries, and leave
          requests permanently.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting…" : "Delete Unit"}
        </button>
      </div>
    </div>
  );
}
