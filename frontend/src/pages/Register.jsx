import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";

const ROLE_OPTIONS = [
  { id: "customer", label: "Customer", desc: "Shop across cities" },
  { id: "shop_owner", label: "Shop Owner", desc: "Sell on marketplace" },
  { id: "delivery_partner", label: "Delivery Partner", desc: "Deliver orders" },
  { id: "collection_partner", label: "Collection Partner", desc: "Pick up from shops" },
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") || "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/marketplace/cities").then((r) => {
      setCities(r.data);
      if (!cityId && r.data.length) setCityId(r.data[0].city_id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const city = cities.find((c) => c.city_id === cityId);
      const u = await register({
        email, password, name, role, phone,
        city_id: cityId, address,
        lat: city?.lat, lng: city?.lng,
      });
      nav(dashboardPath(u.role), { replace: true });
    } catch (e) {
      setError(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-14 px-6">
        <Link to="/" className="font-display font-black text-2xl text-[#002fa7]">
          ShipLink
        </Link>
        <h1 className="font-display font-black text-4xl tracking-tight mt-6">
          Create your account
        </h1>
        <p className="text-zinc-500 mt-1">
          One credential, every role. Warehouse managers are created by admin.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <div className="overline mb-2">I am a</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-testid={`role-${r.id}`}
                  onClick={() => setRole(r.id)}
                  className={`text-left p-3 border transition ${
                    role === r.id
                      ? "border-[#002fa7] bg-[#f2f5ff]"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <div className="font-semibold text-sm">{r.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FormInput label="Full name" testid="input-name" value={name} onChange={setName} required />
            <FormInput label="Email" testid="input-email" type="email" value={email} onChange={setEmail} required />
            <FormInput label="Password" testid="input-password" type="password" value={password} onChange={setPassword} required minLength={6} />
            <FormInput label="Phone" testid="input-phone" value={phone} onChange={setPhone} />
            <div>
              <label className="overline">City</label>
              <select
                data-testid="select-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1 w-full border border-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#002fa7] rounded-md bg-white"
              >
                {cities.map((c) => (
                  <option key={c.city_id} value={c.city_id}>{c.name}</option>
                ))}
              </select>
            </div>
            <FormInput label="Address" testid="input-address" value={address} onChange={setAddress} />
          </div>

          {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2">{error}</div>}

          <button
            data-testid="btn-register"
            type="submit"
            disabled={busy}
            className="btn-primary"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          <div className="text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="text-[#002fa7] font-semibold" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({ label, testid, value, onChange, type = "text", required, minLength }) {
  return (
    <div>
      <label className="overline">{label}</label>
      <input
        data-testid={testid}
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#002fa7] rounded-md"
      />
    </div>
  );
}
