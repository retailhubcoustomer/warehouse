import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";
import {
  User,
  Package,
  Heart,
  Gear,
  SignOut,
  IdentificationCard,
  CaretDown,
} from "@phosphor-icons/react";

/**
 * Modern rounded dropdown card. Icons + labels, mobile responsive
 * (fills bottom of screen on very small screens? — we keep it as a
 * right-aligned card that works both on desktop and mobile).
 */
export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = [
    { to: "/account", label: "Profile", Icon: IdentificationCard, testid: "menu-profile" },
    { to: "/my-orders", label: "My Orders", Icon: Package, testid: "menu-my-orders" },
    { to: "/watchlist", label: "Watchlist", Icon: Heart, testid: "menu-watchlist" },
    { to: "/account?tab=settings", label: "Account Settings", Icon: Gear, testid: "menu-account-settings" },
  ];

  // Role-based extra entry for staff
  if (user && user.role !== "customer") {
    items.push({
      to: dashboardPath(user.role),
      label: "My Dashboard",
      Icon: User,
      testid: "menu-dashboard",
    });
  }

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="btn-profile"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-zinc-200 hover:border-orange-400 transition"
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
            {initials}
          </span>
        )}
        <span className="text-sm font-semibold text-zinc-800 hidden sm:inline max-w-[90px] truncate">
          {user?.name?.split(" ")[0] || "Profile"}
        </span>
        <CaretDown size={12} className="text-zinc-500" weight="bold" />
      </button>

      {open && (
        <div
          data-testid="profile-dropdown"
          className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-zinc-900/10 overflow-hidden z-50 animate-fade-up"
        >
          {/* header */}
          <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{user?.name || "Guest"}</div>
              <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
              <div className="text-[10px] uppercase tracking-widest text-orange-600 font-semibold mt-0.5">
                {(user?.role || "customer").replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* items */}
          <div className="py-1.5">
            {items.map((it) => (
              <Link
                key={it.testid}
                to={it.to}
                data-testid={it.testid}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700 transition"
              >
                <it.Icon size={16} weight="duotone" className="text-orange-500" />
                <span className="font-medium">{it.label}</span>
              </Link>
            ))}
          </div>

          <div className="p-2 border-t border-zinc-100">
            <button
              data-testid="menu-logout"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <SignOut size={16} weight="duotone" />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
