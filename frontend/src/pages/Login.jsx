import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import { formatError } from "@/lib/api";
import { GoogleLogo } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email, password);
      nav(loc.state?.from || dashboardPath(u.role), { replace: true });
    } catch (e) {
      setError(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const fillDemo = (u, p) => {
    setEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div
        className="hidden lg:block relative"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1601599963565-b7ba29c8ba99?w=1600)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#002fa7]/85 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="font-display font-black text-4xl tracking-tight">ShipLink</div>
            <div className="overline mt-2 text-white/70">
              MULTI-CITY MARKETPLACE OPERATIONS
            </div>
          </div>
          <div>
            <div className="font-display font-black text-5xl leading-[1.05] tracking-tight max-w-md">
              Every shop.
              <br /> Every warehouse.
              <br />
              <span className="text-[#ecc94b]">One dashboard.</span>
            </div>
            <p className="mt-6 max-w-md text-white/80 leading-relaxed">
              Kolkata · Siliguri · Durgapur · Malda — orders auto-routed to the
              nearest warehouse via OpenStreetMap geo-intelligence.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="font-display font-black text-2xl text-[#002fa7] lg:hidden">
            ShipLink
          </Link>
          <h1 className="font-display font-black text-4xl tracking-tight mt-6">
            Sign in
          </h1>
          <p className="text-zinc-500 mt-1">
            One login for admins, warehouses, shops, partners & customers.
          </p>

          <button
            data-testid="btn-google-login"
            onClick={google}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 border border-zinc-300 hover:border-zinc-900 py-2.5 font-medium transition"
          >
            <GoogleLogo size={18} weight="bold" /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-400 uppercase tracking-widest">
            <div className="h-px flex-1 bg-zinc-200" /> or email <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="overline">Email</label>
              <input
                data-testid="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#002fa7] rounded-md"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="overline">Password</label>
              <input
                data-testid="input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-zinc-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#002fa7] rounded-md"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="text-sm text-red-600 border border-red-200 bg-red-50 p-2">
                {error}
              </div>
            )}
            <button
              data-testid="btn-login"
              type="submit"
              disabled={busy}
              className="btn-primary w-full"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="text-sm text-zinc-500 mt-4">
            New to ShipLink?{" "}
            <Link to="/register" className="text-[#002fa7] font-semibold" data-testid="link-register">
              Create account
            </Link>
          </div>

          <div className="mt-8 border border-zinc-200 p-4">
            <div className="overline mb-2">DEMO ACCOUNTS</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ["Super Admin", "admin@shiplink.com", "Admin@123"],
                ["Warehouse Mgr", "wh1@shiplink.com", "Warehouse@123"],
                ["Shop Owner", "shop.owner@shiplink.com", "Shop@123"],
                ["Delivery", "delivery.kolkata.1@shiplink.com", "Partner@123"],
                ["Collection", "collection.kolkata.1@shiplink.com", "Partner@123"],
              ].map(([label, u, p]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => fillDemo(u, p)}
                  data-testid={`demo-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-left border border-zinc-200 hover:border-[#002fa7] p-2"
                >
                  <div className="font-semibold text-zinc-700">{label}</div>
                  <div className="font-mono text-[10px] text-zinc-500 truncate">{u}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
