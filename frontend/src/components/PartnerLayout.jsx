import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Package, ClockClockwise, ChartBar, SignOut, MapPin } from "@phosphor-icons/react";

/** Mobile-first layout for delivery / collection partners. */
export default function PartnerLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const base = role === "delivery_partner" ? "/delivery" : "/collection";
  const isCollection = role === "collection_partner";

  const items = [
    {
      to: base,
      label: isCollection ? "Tasks" : "Active",
      icon: Package,
      exact: true,
      testid: "nav-tasks",
    },
    { to: `${base}/history`, label: "History", icon: ClockClockwise, testid: "nav-history" },
    { to: `${base}/stats`, label: "Stats", icon: ChartBar, testid: "nav-stats" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="glass-nav">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center">
          <div>
            <div className="font-display font-black text-lg text-[#002fa7] leading-none">
              ShipLink
            </div>
            <div className="overline mt-1 text-[10px]">
              {isCollection ? "COLLECTION PARTNER" : "DELIVERY PARTNER"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-right hidden xs:block">
              <div className="text-xs text-zinc-500">Hi,</div>
              <div className="text-sm font-semibold">{user?.name?.split(" ")[0]}</div>
            </div>
            <button
              data-testid="btn-logout"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="border border-zinc-200 p-2 rounded-md"
              aria-label="Sign out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-200 bg-white/95 backdrop-blur-xl">
        <div className="max-w-md mx-auto grid grid-cols-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  isActive ? "text-[#002fa7]" : "text-zinc-500"
                }`
              }
            >
              <n.icon size={20} weight="duotone" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    placed: "chip-blue",
    accepted: "chip-blue",
    collected: "chip-yellow",
    at_warehouse: "chip-yellow",
    packed: "chip-yellow",
    out_for_delivery: "chip-blue",
    delivered: "chip-green",
    cancelled: "chip-red",
  };
  return <span className={`chip ${map[status] || ""}`}>{status?.replace(/_/g, " ")}</span>;
}

export function LocationChip({ address }) {
  return (
    <div className="inline-flex items-start gap-1.5 text-xs text-zinc-600">
      <MapPin size={12} weight="duotone" className="mt-0.5 shrink-0" />
      <span className="line-clamp-2">{address}</span>
    </div>
  );
}
