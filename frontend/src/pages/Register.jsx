import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";
import {
  User,
  EnvelopeSimple,
  Phone,
  Lock,
  Globe,
  Gift,
  MapPin,
  Storefront,
  Truck,
  Package,
} from "@phosphor-icons/react";
 
const ROLE_OPTIONS = [
  { id: "customer", label: "Customer", desc: "Shop across cities", Icon: MapPin },
  { id: "shop_owner", label: "Shop Owner", desc: "Sell on marketplace", Icon: Storefront },
  { id: "delivery_partner", label: "Delivery", desc: "Deliver orders", Icon: Truck },
  { id: "collection_partner", label: "Collection", desc: "Pick from shops", Icon: Package },
];
 
// Deterministic 8-char referral code for display
function genRefCode() {
  const raw = (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2))
    .toUpperCase()
    .replace(/[^A-F0-9]/g, "");
  return raw.slice(0, 8);
}
 
export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") || "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [refCode, setRefCode] = useState("");
  const [wasReferred] = useState(!!params.get("ref"));
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState("");
  const [error, setError] = useState("");
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState("");
  const [busy, setBusy] = useState(false);
 
  useEffect(() => {
    api
      .get("/marketplace/cities")
      .then((r) => {
        setCities(r.data);
        if (!cityId && r.data.length) setCityId(r.data[0].city_id);
      })
      .catch((e) => {
        setCitiesError(
          formatError(e.response?.data?.detail) ||
            "Couldn't load cities. Please refresh the page."
        );
      })
      .finally(() => setCitiesLoading(false));
    setRefCode(params.get("ref")?.toUpperCase() || genRefCode());
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
        city_id: cityId,
        lat: city?.lat, lng: city?.lng,
      });
      nav(dashboardPath(u.role), { replace: true });
    } catch (e) {
      setError(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };
 
  const currentRole = ROLE_OPTIONS.find((r) => r.id === role);
 
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* LEFT — form */}
      <div className="flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-home">
            <span className="brand-logo">R</span>
            <span className="leading-tight">
              <div className="font-display font-black text-lg tracking-tight text-zinc-900">
                ShipLink
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Local, delivered
              </div>
            </span>
          </Link>
 
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-7 shadow-sm">
            <h1 className="font-display font-black text-3xl tracking-tight text-zinc-900">
              Create your account
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Join ShipLink in 30 seconds.
            </p>
 
            {wasReferred && (
              <div className="referred-banner mt-4 rounded-xl p-3 flex items-start gap-3" data-testid="referred-banner">
                <Gift size={20} weight="fill" className="text-orange-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-zinc-900">You were referred!</div>
                  <div className="text-zinc-600 text-xs mt-0.5">
                    Complete signup to instantly get ₹50 in your wallet.
                  </div>
                </div>
              </div>
            )}
 
            {/* Role selector */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-zinc-700">I am a</label>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    data-testid={`role-${r.id}`}
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition text-center ${
                      role === r.id
                        ? "border-orange-400 bg-orange-50"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <r.Icon size={16} weight="duotone" className={role === r.id ? "text-orange-600" : "text-zinc-500"} />
                    <span className="text-[10px] font-semibold text-zinc-700">{r.label}</span>
                  </button>
                ))}
              </div>
              {currentRole && (
                <div className="text-[11px] text-zinc-500 mt-1.5">{currentRole.desc}</div>
              )}
            </div>
 
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Full name" testid="input-name">
                <User size={16} className="field-icon" weight="duotone" />
                <input
                  data-testid="input-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aisha Sharma"
                  className="field-input"
                />
              </Field>
              <Field label="Email" testid="input-email">
                <EnvelopeSimple size={16} className="field-icon" weight="duotone" />
                <input
                  data-testid="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-input"
                />
              </Field>
              <Field label="Phone (optional)" testid="input-phone">
                <Phone size={16} className="field-icon" weight="duotone" />
                <input
                  data-testid="input-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98••••••••"
                  className="field-input"
                />
              </Field>
              <Field label="Password" testid="input-password">
                <Lock size={16} className="field-icon" weight="duotone" />
                <input
                  data-testid="input-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="field-input"
                />
              </Field>
              <div>
                <label className="text-xs font-semibold text-zinc-700">City</label>
                <div className="field-wrap mt-1">
                  <MapPin size={16} className="field-icon" weight="duotone" />
                  <select
                    data-testid="select-city"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={citiesLoading || !!citiesError || cities.length === 0}
                    className="field-input appearance-none bg-white cursor-pointer"
                  >
                    {citiesLoading && <option value="">Loading cities…</option>}
                    {!citiesLoading && citiesError && (
                      <option value="">Couldn't load cities</option>
                    )}
                    {!citiesLoading && !citiesError && cities.length === 0 && (
                      <option value="">No cities available</option>
                    )}
                    {cities.map((c) => (
                      <option key={c.city_id} value={c.city_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {citiesError && (
                  <div data-testid="cities-error" className="text-xs text-red-600 mt-1">
                    {citiesError}
                  </div>
                )}
              </div>
              <Field label="Referral code (optional)" testid="input-ref">
                <Globe size={16} className="field-icon" weight="duotone" />
                <input
                  data-testid="input-ref"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                  placeholder="Optional"
                  className="field-input font-mono tracking-widest"
                />
              </Field>
 
              {error && (
                <div data-testid="register-error" className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded-lg">
                  {error}
                </div>
              )}
 
              <button
                data-testid="btn-register"
                type="submit"
                disabled={busy}
                className="btn-orange w-full justify-center text-base py-3"
              >
                {busy ? "Creating…" : "Create account"}
              </button>
 
              <div className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link to="/login" className="text-orange-600 font-semibold" data-testid="link-login">
                  Log in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
 
      {/* RIGHT — hero image */}
      <div
        className="relative order-1 lg:order-2 min-h-[280px] lg:min-h-screen bg-zinc-900"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent lg:from-black/50 lg:via-transparent lg:to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-12 text-white">
          <div />
          <div className="max-w-md">
            <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight leading-[1.02]">
              Get more done, <span className="orange-text-gradient">locally.</span>
            </h2>
            <p className="mt-3 text-white/85 text-sm lg:text-base leading-relaxed">
              Groceries, medicines, food, rides — one app, thousands of local shops.
            </p>
          </div>
          <div className="text-xs text-white/60 font-mono">© 2026 ShipLink</div>
        </div>
      </div>
    </div>
  );
}
 
function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-700">{label}</label>
      <div className="field-wrap mt-1">{children}</div>
    </div>
  );
}
// import React, { useEffect, useState } from "react";
// import { Link, useNavigate, useSearchParams } from "react-router-dom";
// import { useAuth, dashboardPath } from "@/context/AuthContext";
// import api, { formatError } from "@/lib/api";
// import {
//   User,
//   EnvelopeSimple,
//   Phone,
//   Lock,
//   Globe,
//   Gift,
//   MapPin,
//   Storefront,
//   Truck,
//   Package,
// } from "@phosphor-icons/react";

// const ROLE_OPTIONS = [
//   { id: "customer", label: "Customer", desc: "Shop across cities", Icon: MapPin },
//   { id: "shop_owner", label: "Shop Owner", desc: "Sell on marketplace", Icon: Storefront },
//   { id: "delivery_partner", label: "Delivery", desc: "Deliver orders", Icon: Truck },
//   { id: "collection_partner", label: "Collection", desc: "Pick from shops", Icon: Package },
// ];

// // Deterministic 8-char referral code for display
// function genRefCode() {
//   const raw = (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2))
//     .toUpperCase()
//     .replace(/[^A-F0-9]/g, "");
//   return raw.slice(0, 8);
// }

// export default function Register() {
//   const { register } = useAuth();
//   const nav = useNavigate();
//   const [params] = useSearchParams();
//   const [role, setRole] = useState(params.get("role") || "customer");
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [phone, setPhone] = useState("");
//   const [refCode, setRefCode] = useState("");
//   const [wasReferred] = useState(!!params.get("ref"));
//   const [cities, setCities] = useState([]);
//   const [cityId, setCityId] = useState("");
//   const [error, setError] = useState("");
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     api.get("/marketplace/cities").then((r) => {
//       setCities(r.data);
//       if (!cityId && r.data.length) setCityId(r.data[0].city_id);
//     });
//     setRefCode(params.get("ref")?.toUpperCase() || genRefCode());
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const submit = async (e) => {
//     e.preventDefault();
//     setBusy(true);
//     setError("");
//     try {
//       const city = cities.find((c) => c.city_id === cityId);
//       const u = await register({
//         email, password, name, role, phone,
//         city_id: cityId,
//         lat: city?.lat, lng: city?.lng,
//       });
//       nav(dashboardPath(u.role), { replace: true });
//     } catch (e) {
//       setError(formatError(e.response?.data?.detail) || e.message);
//     } finally {
//       setBusy(false);
//     }
//   };

//   const currentRole = ROLE_OPTIONS.find((r) => r.id === role);

//   return (
//     <div className="min-h-screen grid lg:grid-cols-2 bg-white">
//       {/* LEFT — form */}
//       <div className="flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1">
//         <div className="w-full max-w-md">
//           <Link to="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-home">
//             <span className="brand-logo">R</span>
//             <span className="leading-tight">
//               <div className="font-display font-black text-lg tracking-tight text-zinc-900">
//                 ShipLink
//               </div>
//               <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
//                 Local, delivered
//               </div>
//             </span>
//           </Link>

//           <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-7 shadow-sm">
//             <h1 className="font-display font-black text-3xl tracking-tight text-zinc-900">
//               Create your account
//             </h1>
//             <p className="text-zinc-500 text-sm mt-1">
//               Join ShipLink in 30 seconds.
//             </p>

//             {wasReferred && (
//               <div className="referred-banner mt-4 rounded-xl p-3 flex items-start gap-3" data-testid="referred-banner">
//                 <Gift size={20} weight="fill" className="text-orange-500 mt-0.5" />
//                 <div className="text-sm">
//                   <div className="font-bold text-zinc-900">You were referred!</div>
//                   <div className="text-zinc-600 text-xs mt-0.5">
//                     Complete signup to instantly get ₹50 in your wallet.
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Role selector */}
//             <div className="mt-5">
//               <label className="text-xs font-semibold text-zinc-700">I am a</label>
//               <div className="mt-2 grid grid-cols-4 gap-1.5">
//                 {ROLE_OPTIONS.map((r) => (
//                   <button
//                     key={r.id}
//                     type="button"
//                     data-testid={`role-${r.id}`}
//                     onClick={() => setRole(r.id)}
//                     className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition text-center ${
//                       role === r.id
//                         ? "border-orange-400 bg-orange-50"
//                         : "border-zinc-200 hover:border-zinc-400"
//                     }`}
//                   >
//                     <r.Icon size={16} weight="duotone" className={role === r.id ? "text-orange-600" : "text-zinc-500"} />
//                     <span className="text-[10px] font-semibold text-zinc-700">{r.label}</span>
//                   </button>
//                 ))}
//               </div>
//               {currentRole && (
//                 <div className="text-[11px] text-zinc-500 mt-1.5">{currentRole.desc}</div>
//               )}
//             </div>

//             <form onSubmit={submit} className="mt-5 space-y-3">
//               <Field label="Full name" testid="input-name">
//                 <User size={16} className="field-icon" weight="duotone" />
//                 <input
//                   data-testid="input-name"
//                   required
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   placeholder="Aisha Sharma"
//                   className="field-input"
//                 />
//               </Field>
//               <Field label="Email" testid="input-email">
//                 <EnvelopeSimple size={16} className="field-icon" weight="duotone" />
//                 <input
//                   data-testid="input-email"
//                   type="email"
//                   required
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="you@example.com"
//                   className="field-input"
//                 />
//               </Field>
//               <Field label="Phone (optional)" testid="input-phone">
//                 <Phone size={16} className="field-icon" weight="duotone" />
//                 <input
//                   data-testid="input-phone"
//                   value={phone}
//                   onChange={(e) => setPhone(e.target.value)}
//                   placeholder="+91 98••••••••"
//                   className="field-input"
//                 />
//               </Field>
//               <Field label="Password" testid="input-password">
//                 <Lock size={16} className="field-icon" weight="duotone" />
//                 <input
//                   data-testid="input-password"
//                   type="password"
//                   required
//                   minLength={6}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="At least 6 characters"
//                   className="field-input"
//                 />
//               </Field>
//               <div>
//                 <label className="text-xs font-semibold text-zinc-700">City</label>
//                 <div className="field-wrap mt-1">
//                   <MapPin size={16} className="field-icon" weight="duotone" />
//                   <select
//                     data-testid="select-city"
//                     value={cityId}
//                     onChange={(e) => setCityId(e.target.value)}
//                     className="field-input appearance-none bg-white cursor-pointer"
//                   >
//                     {cities.map((c) => (
//                       <option key={c.city_id} value={c.city_id}>{c.name}</option>
//                     ))}
//                   </select>
//                 </div>
//               </div>
//               <Field label="Referral code (optional)" testid="input-ref">
//                 <Globe size={16} className="field-icon" weight="duotone" />
//                 <input
//                   data-testid="input-ref"
//                   value={refCode}
//                   onChange={(e) => setRefCode(e.target.value.toUpperCase())}
//                   placeholder="Optional"
//                   className="field-input font-mono tracking-widest"
//                 />
//               </Field>

//               {error && (
//                 <div data-testid="register-error" className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded-lg">
//                   {error}
//                 </div>
//               )}

//               <button
//                 data-testid="btn-register"
//                 type="submit"
//                 disabled={busy}
//                 className="btn-orange w-full justify-center text-base py-3"
//               >
//                 {busy ? "Creating…" : "Create account"}
//               </button>

//               <div className="text-center text-sm text-zinc-500">
//                 Already have an account?{" "}
//                 <Link to="/login" className="text-orange-600 font-semibold" data-testid="link-login">
//                   Log in
//                 </Link>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>

//       {/* RIGHT — hero image */}
//       <div
//         className="relative order-1 lg:order-2 min-h-[280px] lg:min-h-screen bg-zinc-900"
//         style={{
//           backgroundImage:
//             "url(https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80)",
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//         }}
//       >
//         <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent lg:from-black/50 lg:via-transparent lg:to-black/20" />
//         <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-12 text-white">
//           <div />
//           <div className="max-w-md">
//             <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight leading-[1.02]">
//               Get more done, <span className="orange-text-gradient">locally.</span>
//             </h2>
//             <p className="mt-3 text-white/85 text-sm lg:text-base leading-relaxed">
//               Groceries, medicines, food, rides — one app, thousands of local shops.
//             </p>
//           </div>
//           <div className="text-xs text-white/60 font-mono">© 2026 ShipLink</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Field({ label, children }) {
//   return (
//     <div>
//       <label className="text-xs font-semibold text-zinc-700">{label}</label>
//       <div className="field-wrap mt-1">{children}</div>
//     </div>
//   );
// }
