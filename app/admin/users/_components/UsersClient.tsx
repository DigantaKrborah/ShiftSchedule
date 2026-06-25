"use client";
import { useState } from "react";

type UserRow = { id: string; username: string; password: string; role: string; unitId: string | null; unitName: string | null };
type UnitOption = { id: string; name: string };

export default function UsersClient({ initialUsers, units }: { initialUsers: UserRow[]; units: UnitOption[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "UNIT_USER", unitId: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  function startEdit(u: UserRow) {
    setEditId(u.id);
    setForm({ username: u.username, password: u.password, role: u.role, unitId: u.unitId ?? "" });
    setShowAdd(false);
  }

  async function handleSave(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, unitId: form.unitId || null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Save failed"); return; }
    const updated = await res.json() as { id: string; username: string; role: string; unitId: string | null };
    setUsers(prev => prev.map(u => u.id === id ? { ...u, username: updated.username, password: form.password, role: updated.role, unitId: updated.unitId, unitName: units.find(x => x.id === updated.unitId)?.name ?? null } : u));
    setEditId(null);
    setError("");
  }

  async function handleAdd() {
    if (!form.username || !form.password) { setError("Username and password required"); return; }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, unitId: form.unitId || null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Add failed"); return; }
    const newUser = await res.json() as { id: string; username: string; role: string; unitId: string | null };
    setUsers(prev => [...prev, { ...newUser, password: form.password, unitName: units.find(x => x.id === newUser.unitId)?.name ?? null }]);
    setForm({ username: "", password: "", role: "UNIT_USER", unitId: "" });
    setShowAdd(false);
    setError("");
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete user "${username}"?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  const inputCls = "border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-slate-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">User Accounts</h2>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ username: "", password: "", role: "UNIT_USER", unitId: "" }); }} className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">+ Add User</button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-3">{error}</p>}

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Username</label><input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Password</label><input className={inputCls} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
            <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="ADMIN">Admin</option>
              <option value="UNIT_USER">Unit User</option>
            </select>
          </div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Unit</label>
            <select className={inputCls} value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
              <option value="">— None (Admin) —</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end mt-1">
            <button onClick={() => setShowAdd(false)} className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100">Cancel</button>
            <button onClick={handleAdd} className="text-sm px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-700">Add User</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Password</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned Unit</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {editId === u.id ? (
                  <>
                    <td className="px-4 py-2"><input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></td>
                    <td className="px-4 py-2">
                      <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="ADMIN">Admin</option>
                        <option value="UNIT_USER">Unit User</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select className={inputCls} value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
                        <option value="">— None —</option>
                        {units.map(uo => <option key={uo.id} value={uo.id}>{uo.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 flex gap-1 justify-end">
                      <button onClick={() => handleSave(u.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                      <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{u.password}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.unitName ?? <span className="text-gray-400 italic">All units</span>}</td>
                    <td className="px-4 py-3 flex gap-1 justify-end">
                      <button onClick={() => startEdit(u)} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">Edit</button>
                      <button onClick={() => handleDelete(u.id, u.username)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
