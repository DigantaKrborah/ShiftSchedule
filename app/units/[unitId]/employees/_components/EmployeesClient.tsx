"use client";

import { useState } from "react";
import type { Employee } from "@prisma/client";

interface FormState {
  name: string;
  doesRotatingShift: boolean;
  eligibleGShift: boolean;
  eligibleTwelveHr: boolean;
  givesLeaveBackup: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  doesRotatingShift: true,
  eligibleGShift: true,
  eligibleTwelveHr: true,
  givesLeaveBackup: true,
};

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-slate-700 focus:ring-slate-500"
      />
      {label}
    </label>
  );
}

export function EmployeesClient({
  unitId,
  initialEmployees,
}: {
  unitId: string;
  employees?: Employee[];
  initialEmployees: Employee[];
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openAdd() {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setShowForm(true);
    setError("");
  }

  function openEdit(emp: Employee) {
    setForm({
      name: emp.name,
      doesRotatingShift: emp.doesRotatingShift,
      eligibleGShift: emp.eligibleGShift,
      eligibleTwelveHr: emp.eligibleTwelveHr,
      givesLeaveBackup: emp.givesLeaveBackup,
    });
    setEditId(emp.id);
    setShowForm(true);
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editId) {
        const res = await fetch(`/api/units/${unitId}/employees/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated: Employee = await res.json();
        setEmployees((prev) =>
          prev.map((e) => (e.id === editId ? updated : e))
        );
      } else {
        const res = await fetch(`/api/units/${unitId}/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: Employee = await res.json();
        setEmployees((prev) =>
          [...prev, created].sort((a, b) => a.seniorityIndex - b.seniorityIndex)
        );
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete employee "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/units/${unitId}/employees/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    }
  }

  const bool = (v: boolean) =>
    v ? (
      <span className="text-green-700">✓</span>
    ) : (
      <span className="text-gray-300">—</span>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{employees.length} employee(s)</p>
        <button
          onClick={openAdd}
          className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          + Add Employee
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm space-y-4"
        >
          <p className="font-semibold text-sm text-gray-800">
            {editId ? "Edit Employee" : "Add Employee"}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Full name"
              className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <CheckField
              label="Rotating shift"
              checked={form.doesRotatingShift}
              onChange={(v) => setForm((f) => ({ ...f, doesRotatingShift: v }))}
            />
            <CheckField
              label="G-shift eligible"
              checked={form.eligibleGShift}
              onChange={(v) => setForm((f) => ({ ...f, eligibleGShift: v }))}
            />
            <CheckField
              label="12-hr eligible"
              checked={form.eligibleTwelveHr}
              onChange={(v) => setForm((f) => ({ ...f, eligibleTwelveHr: v }))}
            />
            <CheckField
              label="Gives leave backup"
              checked={form.givesLeaveBackup}
              onChange={(v) => setForm((f) => ({ ...f, givesLeaveBackup: v }))}
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {employees.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          No employees yet — add one above
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Name</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Rotating</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">G-Eligible</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">12hr</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Leave Backup</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">12hr Count</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Off Days</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{emp.seniorityIndex}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-3 py-2.5 text-center">{bool(emp.doesRotatingShift)}</td>
                  <td className="px-3 py-2.5 text-center">{bool(emp.eligibleGShift)}</td>
                  <td className="px-3 py-2.5 text-center">{bool(emp.eligibleTwelveHr)}</td>
                  <td className="px-3 py-2.5 text-center">{bool(emp.givesLeaveBackup)}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">
                    {emp.cumulative12hrCount}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-600">
                    {emp.cumulativeOffDays}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(emp)}
                      className="text-slate-600 hover:text-slate-900 text-xs mr-3 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id, emp.name)}
                      className="text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
