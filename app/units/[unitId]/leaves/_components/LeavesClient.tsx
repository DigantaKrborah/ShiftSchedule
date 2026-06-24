"use client";

import { useState } from "react";

interface LeaveRow {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PLANNED" | "EMERGENCY";
}

interface EmpOption {
  id: string;
  name: string;
}

export function LeavesClient({
  unitId,
  employees,
  initialLeaves,
}: {
  unitId: string;
  employees: EmpOption[];
  initialLeaves: LeaveRow[];
}) {
  const [leaves, setLeaves] = useState<LeaveRow[]>(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
    status: "PLANNED" as "PLANNED" | "EMERGENCY",
  });

  function openAdd() {
    setForm({
      employeeId: employees[0]?.id ?? "",
      startDate: "",
      endDate: "",
      reason: "",
      status: "PLANNED",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/units/${unitId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const emp = employees.find((e) => e.id === data.employeeId);
      setLeaves((prev) =>
        [
          {
            id: data.id,
            employeeId: data.employeeId,
            employeeName: emp?.name ?? "",
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            status: data.status,
          },
          ...prev,
        ].sort((a, b) => b.startDate.localeCompare(a.startDate))
      );
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this leave request?")) return;
    const res = await fetch(`/api/units/${unitId}/leaves/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setLeaves((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{leaves.length} leave request(s)</p>
        <button
          onClick={openAdd}
          className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          + Add Leave
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm space-y-4"
        >
          <p className="font-semibold text-sm text-gray-800">Add Leave Request</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as "PLANNED" | "EMERGENCY",
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="PLANNED">Planned</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Optional"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Add Leave"}
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
      {leaves.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          No leave requests yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Employee</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Start</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">End</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Days</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Reason</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave, idx) => {
                const start = new Date(leave.startDate + "T00:00:00");
                const end = new Date(leave.endDate + "T00:00:00");
                const days =
                  Math.round(
                    (end.getTime() - start.getTime()) / 86400000
                  ) + 1;
                return (
                  <tr
                    key={leave.id}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-4 py-2.5 font-medium">{leave.employeeName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{leave.startDate}</td>
                    <td className="px-4 py-2.5 text-gray-700">{leave.endDate}</td>
                    <td className="px-4 py-2.5 text-gray-600">{days}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          leave.status === "EMERGENCY"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{leave.reason || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(leave.id)}
                        className="text-red-500 hover:text-red-700 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
