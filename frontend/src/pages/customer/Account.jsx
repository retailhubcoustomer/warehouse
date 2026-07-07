import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { formatError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  EnvelopeSimple,
  Phone,
  MapPin,
  Lock,
  Bell,
  Globe,
  IdentificationCard,
  Gear,
} from "@phosphor-icons/react";

const TABS = [
  { id: "profile", label: "Profile", Icon: IdentificationCard },
  { id: "settings", label: "Account Settings", Icon: Gear },
  { id: "preferences", label: "Preferences", Icon: Bell },
  { id: "security", label: "Security", Icon: Lock },
];

export default function Account() {
  const { user, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "profile";
  const setTab = (t) => setParams(t === "profile" ? {} : { tab: t });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 px-5">
        <div className="text-zinc-500">Please log in to view your account.</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 pt-8 pb-16">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          MY ACCOUNT
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-zinc-900 mt-1">
          {user.name}
        </h1>
        <p className="text-zinc-500 mt-1">{user.email}</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Side tabs */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`shrink-0 lg:shrink inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left ${
                tab === t.id
                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                  : "text-zinc-700 hover:bg-zinc-50 border border-transparent"
              }`}
            >
              <t.Icon size={16} weight="duotone" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          {tab === "profile" && <ProfileTab />}
          {tab === "settings" && <SettingsTab onSaved={refresh} />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

// ---------------- Profile (read-only summary) ----------------
function ProfileTab() {
  const { user } = useAuth();
  const rows = [
    { Icon: User, label: "Full name", value: user.name },
    { Icon: EnvelopeSimple, label: "Email", value: user.email },
    { Icon: Phone, label: "Phone", value: user.phone || "—" },
    { Icon: MapPin, label: "Address", value: user.address || "—" },
    { Icon: Globe, label: "Role", value: (user.role || "").replace(/_/g, " ") },
  ];
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-800 mb-1">Profile</div>
      <div className="text-xs text-zinc-500 mb-5">A quick summary of your account.</div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50">
            <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
              <r.Icon size={16} weight="duotone" className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                {r.label}
              </div>
              <div className="text-sm font-semibold text-zinc-900 truncate capitalize">
                {r.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Settings (editable profile) ----------------
function SettingsTab({ onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
    city_id: user.city_id || "",
  });
  const [cities, setCities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get("/marketplace/cities").then((r) => setCities(r.data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null); setErr(null);
    try {
      await api.patch("/user/profile", form);
      await onSaved?.();
      setMsg("Profile updated");
    } catch (e) {
      setErr(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="text-sm font-semibold text-zinc-800 mb-1">Account settings</div>
      <div className="text-xs text-zinc-500 mb-5">Manage your profile information.</div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full name" testid="settings-name">
          <input required data-testid="settings-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input pl-3" />
        </Field>
        <Field label="Phone" testid="settings-phone">
          <input data-testid="settings-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="field-input pl-3" placeholder="+91 98••••••••" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Delivery address" testid="settings-address">
            <input data-testid="settings-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="field-input pl-3" />
          </Field>
        </div>
        <Field label="City" testid="settings-city">
          <select data-testid="settings-city"
            value={form.city_id}
            onChange={(e) => setForm({ ...form, city_id: e.target.value })}
            className="field-input pl-3 bg-white cursor-pointer">
            <option value="">Select</option>
            {cities.map((c) => (<option key={c.city_id} value={c.city_id}>{c.name}</option>))}
          </select>
        </Field>
      </div>

      {msg && <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2" data-testid="settings-success">{msg}</div>}
      {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
      <div className="mt-6">
        <button data-testid="btn-save-settings" type="submit" disabled={busy} className="btn-orange">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

// ---------------- Preferences ----------------
function PreferencesTab() {
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get("/user/preferences").then((r) => setPrefs(r.data));
  }, []);
  if (!prefs) return <div className="text-zinc-500 text-sm">Loading…</div>;

  const set = (patch) => setPrefs((p) => ({ ...p, ...patch }));

  const save = async () => {
    await api.patch("/user/preferences", {
      city_id: prefs.city_id,
      notifications_email: prefs.notifications_email,
      notifications_push: prefs.notifications_push,
      marketing_opt_in: prefs.marketing_opt_in,
      language: prefs.language,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div className="text-sm font-semibold text-zinc-800 mb-1">Preferences</div>
      <div className="text-xs text-zinc-500 mb-5">Notifications and language.</div>
      <div className="space-y-3">
        <ToggleRow
          label="Email notifications"
          desc="Order updates and receipts via email"
          value={prefs.notifications_email}
          onChange={(v) => set({ notifications_email: v })}
          testid="pref-email"
        />
        <ToggleRow
          label="Push notifications"
          desc="In-app updates on your order timeline"
          value={prefs.notifications_push}
          onChange={(v) => set({ notifications_push: v })}
          testid="pref-push"
        />
        <ToggleRow
          label="Promotional emails"
          desc="Deals, coupons and marketplace news"
          value={prefs.marketing_opt_in}
          onChange={(v) => set({ marketing_opt_in: v })}
          testid="pref-marketing"
        />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button data-testid="btn-save-prefs" onClick={save} className="btn-orange">Save preferences</button>
        {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange, testid }) {
  return (
    <label className="flex items-start gap-4 p-4 rounded-xl border border-zinc-200 hover:border-orange-300 cursor-pointer" data-testid={testid}>
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 relative inline-flex w-11 h-6 rounded-full transition ${
          value ? "bg-orange-500" : "bg-zinc-200"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

// ---------------- Security ----------------
function SecurityTab() {
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null); setErr(null);
    try {
      await api.post("/user/password", pw);
      setMsg("Password updated");
      setPw({ old_password: "", new_password: "" });
    } catch (e) {
      setErr(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };
  return (
    <form onSubmit={save} className="max-w-md">
      <div className="text-sm font-semibold text-zinc-800 mb-1">Change password</div>
      <div className="text-xs text-zinc-500 mb-5">
        Leave current password empty if you signed up via Google and are setting a password for the first time.
      </div>
      <div className="space-y-3">
        <Field label="Current password">
          <input data-testid="pw-old" type="password"
            value={pw.old_password}
            onChange={(e) => setPw({ ...pw, old_password: e.target.value })}
            className="field-input pl-3" placeholder="Leave blank if setting for the first time" />
        </Field>
        <Field label="New password">
          <input data-testid="pw-new" type="password" required minLength={6}
            value={pw.new_password}
            onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
            className="field-input pl-3" placeholder="At least 6 characters" />
        </Field>
      </div>
      {msg && <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">{msg}</div>}
      {err && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
      <div className="mt-6">
        <button data-testid="btn-save-password" type="submit" disabled={busy} className="btn-orange">
          {busy ? "Saving…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
