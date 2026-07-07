import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";
import {
  ShoppingCart,
  User,
  MapPin,
  SignOut,
  CaretDown,
  Truck,
  Package,
} from "@phosphor-icons/react";

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState(localStorage.getItem("shiplink_city") || "");
  const [pickerOpen, setPickerOpen] = useState(false);

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
    setPickerOpen(false);
    window.dispatchEvent(new CustomEvent("shiplink:city-change", { detail: id }));
  };

  const cityName = cities.find((c) => c.city_id === cityId)?.name || "Select";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
          <Link
            to="/"
            data-testid="brand-home"
            className="flex items-center gap-2.5"
          >
            <span className="brand-logo">R</span>
            <span className="hidden sm:block leading-tight">
              <div className="font-display font-black text-lg tracking-tight text-zinc-900">
                ShipLink
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Local, delivered
              </div>
            </span>
          </Link>

          {/* City picker (styled to match mockup) */}
          <div className="relative">
            <button
              data-testid="city-picker"
              onClick={() => setPickerOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-full text-sm font-semibold hover:border-orange-400 transition"
            >
              <MapPin size={14} weight="fill" className="text-orange-500" />
              {cityName}
              <CaretDown size={12} />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-50">
                {cities.map((c) => (
                  <button
                    key={c.city_id}
                    onClick={() => changeCity(c.city_id)}
                    data-testid={`city-opt-${c.city_id}`}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 ${
                      c.city_id === cityId ? "text-orange-600 font-semibold bg-orange-50/60" : ""
                    }`}
                  >
                    {c.name}
                    <span className="ml-2 text-xs text-zinc-400">{c.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search shortcut is on hero — desktop nav here */}
          <div className="hidden lg:flex ml-2 items-center flex-1 max-w-md border border-zinc-200 rounded-full px-4 py-2 text-sm text-zinc-400 cursor-pointer hover:border-orange-400 transition"
                onClick={() => window.scrollTo({ top: 240, behavior: "smooth" })}>
            <span>Search shops, products, categories…</span>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm font-semibold ml-auto text-zinc-700">
            <NavLink to="/transport" className="inline-flex items-center gap-1.5 hover:text-orange-600" data-testid="nav-transport">
              <Truck size={16} weight="duotone" /> Transport
            </NavLink>
            <NavLink to="/my-orders" className="inline-flex items-center gap-1.5 hover:text-orange-600" data-testid="nav-my-orders">
              <Package size={16} weight="duotone" /> Orders
            </NavLink>
            <Link
              to="/cart"
              data-testid="nav-cart"
              className="relative inline-flex items-center gap-1.5 hover:text-orange-600"
            >
              <ShoppingCart size={16} weight="duotone" />
              <span>Cart</span>
              {count > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </nav>

          <div className="md:hidden ml-auto">
            <Link
              to="/cart"
              data-testid="nav-cart-mobile"
              className="relative inline-flex items-center justify-center w-9 h-9 border border-zinc-200 rounded-full"
            >
              <ShoppingCart size={16} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={dashboardPath(user.role)}
                className="text-sm hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 hover:border-orange-400"
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
                className="text-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-zinc-200 hover:border-orange-400"
                aria-label="Logout"
              >
                <SignOut size={14} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login"
              className="btn-orange text-sm py-2 px-5"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ cityId, setCityId: changeCity, cities }} />
      </main>

      <footer className="border-t border-zinc-200 mt-16 py-10 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="brand-logo" style={{ width: 32, height: 32, fontSize: "1rem" }}>R</span>
              <div className="font-display font-black text-xl tracking-tight">
                ShipLink
              </div>
            </div>
            <p className="text-zinc-500">
              Every shop in your neighbourhood — delivered from the nearest warehouse.
            </p>
          </div>
          <div>
            <div className="overline mb-3">Explore</div>
            <ul className="space-y-2 text-zinc-600">
              <li>Groceries</li>
              <li>Restaurants</li>
              <li>Medicines</li>
              <li>Transport</li>
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
