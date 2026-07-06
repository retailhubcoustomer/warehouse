import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";
import { ShoppingCart, MagnifyingGlass, User, MapPin, SignOut } from "@phosphor-icons/react";

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState(localStorage.getItem("shiplink_city") || "");

  useEffect(() => {
    api.get("/marketplace/cities").then((r) => {
      setCities(r.data);
      if (!cityId && r.data.length) {
        setCityId(r.data[0].city_id);
        localStorage.setItem("shiplink_city", r.data[0].city_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCity = (id) => {
    setCityId(id);
    localStorage.setItem("shiplink_city", id);
    window.dispatchEvent(new CustomEvent("shiplink:city-change", { detail: id }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
          <Link
            to="/"
            data-testid="brand-home"
            className="font-display font-black text-2xl tracking-tight text-[#002fa7]"
          >
            ShipLink
          </Link>
          <div className="hidden md:flex items-center gap-2 border border-zinc-200 px-3 py-1.5 rounded-md">
            <MapPin size={16} className="text-[#002fa7]" weight="duotone" />
            <select
              data-testid="city-select"
              value={cityId}
              onChange={(e) => changeCity(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none"
            >
              {cities.map((c) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium ml-4">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "text-[#002fa7]" : "text-zinc-700 hover:text-black")}>
              Explore
            </NavLink>
            <NavLink to="/my-orders" className={({ isActive }) => (isActive ? "text-[#002fa7]" : "text-zinc-700 hover:text-black")} data-testid="nav-my-orders">
              My Orders
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/cart"
              data-testid="nav-cart"
              className="relative inline-flex items-center gap-2 border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400 text-sm"
            >
              <ShoppingCart size={16} />
              <span>Cart</span>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#002fa7] text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={dashboardPath(user.role)}
                  className="text-sm hidden md:inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400"
                  data-testid="nav-account"
                >
                  <User size={14} /> {user.name?.split(" ")[0]}
                </Link>
                <button
                  data-testid="btn-logout"
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="text-sm hidden md:inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400"
                >
                  <SignOut size={14} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="nav-login"
                className="btn-primary text-sm inline-flex items-center gap-1.5"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ cityId, setCityId: changeCity, cities }} />
      </main>

      <footer className="border-t border-zinc-200 mt-16 py-10 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="font-display font-black text-xl text-[#002fa7] mb-2">
              ShipLink
            </div>
            <p className="text-zinc-500">
              Multi-city warehouse marketplace connecting shops, warehouses and delivery partners.
            </p>
          </div>
          <div>
            <div className="overline mb-3">Company</div>
            <ul className="space-y-2 text-zinc-600">
              <li>About</li>
              <li>Careers</li>
              <li>Press</li>
            </ul>
          </div>
          <div>
            <div className="overline mb-3">Partners</div>
            <ul className="space-y-2 text-zinc-600">
              <li><Link to="/register?role=shop_owner">Sell on ShipLink</Link></li>
              <li><Link to="/register?role=delivery_partner">Deliver with us</Link></li>
              <li><Link to="/register?role=collection_partner">Collection partner</Link></li>
            </ul>
          </div>
          <div>
            <div className="overline mb-3">Cities live</div>
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <span key={c.city_id} className="chip">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-zinc-400 font-mono">
          © 2026 ShipLink · Powered by OpenStreetMap
        </div>
      </footer>
    </div>
  );
}

export function useSearchIcon() {
  return MagnifyingGlass;
}
