import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ChartLineUp,
  MapTrifold,
  Buildings,
  Warehouse,
  Users,
  Storefront,
  Package,
  Tag,
  Megaphone,
  IdentificationBadge,
  SignOut,
  List as ListIcon,
} from "@phosphor-icons/react";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: ChartLineUp, exact: true, testid: "nav-overview" },
  { to: "/admin/live-map", label: "Live Map", icon: MapTrifold, testid: "nav-live-map" },
  { to: "/admin/cities", label: "Cities", icon: Buildings, testid: "nav-cities" },
  { to: "/admin/warehouses", label: "Warehouses", icon: Warehouse, testid: "nav-warehouses" },
  { to: "/admin/shops", label: "Shops", icon: Storefront, testid: "nav-shops" },
  { to: "/admin/orders", label: "Orders", icon: Package, testid: "nav-orders" },
  { to: "/admin/users", label: "Users", icon: Users, testid: "nav-users" },
  { to: "/admin/kyc", label: "KYC", icon: IdentificationBadge, testid: "nav-kyc" },
  { to: "/admin/coupons", label: "Coupons", icon: Tag, testid: "nav-coupons" },
  { to: "/admin/ads", label: "Ads", icon: Megaphone, testid: "nav-ads" },
];

const WAREHOUSE_NAV = [
  { to: "/warehouse", label: "Overview", icon: ChartLineUp, exact: true, testid: "nav-overview" },
  { to: "/warehouse/orders", label: "Orders", icon: Package, testid: "nav-orders" },
  { to: "/warehouse/packing", label: "Packing Queue", icon: Warehouse, testid: "nav-packing" },
  { to: "/warehouse/inventory", label: "Inventory", icon: ListIcon, testid: "nav-inventory" },
  { to: "/warehouse/staff", label: "Staff", icon: Users, testid: "nav-staff" },
];

const SHOP_NAV = [
  { to: "/shop", label: "Overview", icon: ChartLineUp, exact: true, testid: "nav-overview" },
  { to: "/shop/products", label: "Products", icon: Package, testid: "nav-products" },
  { to: "/shop/orders", label: "Orders", icon: Storefront, testid: "nav-orders" },
];

const NAV_BY_ROLE = {
  super_admin: { items: ADMIN_NAV, title: "ShipLink Admin", scope: "SUPER ADMIN" },
  warehouse_manager: { items: WAREHOUSE_NAV, title: "Warehouse Console", scope: "WAREHOUSE" },
  shop_owner: { items: SHOP_NAV, title: "Shop Console", scope: "SHOP OWNER" },
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const conf = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.super_admin;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } fixed lg:static lg:translate-x-0 z-40 h-screen w-64 border-r border-zinc-200 bg-white transition-transform duration-200`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-200">
          <div>
            <div className="font-display font-black text-xl leading-none tracking-tight text-[#002fa7]">
              ShipLink
            </div>
            <div className="overline mt-1 text-[10px]">{conf.scope}</div>
          </div>
          <button
            className="lg:hidden text-zinc-500"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="py-3 flex flex-col gap-0.5">
          {conf.items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              data-testid={n.testid}
              className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <n.icon size={18} weight="duotone" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            {user?.name}
          </div>
          <div className="text-sm truncate">{user?.email}</div>
          <button
            data-testid="btn-logout"
            onClick={handleLogout}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-zinc-200 hover:border-zinc-400 text-zinc-700 py-1.5 text-sm transition"
          >
            <SignOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-0 flex flex-col min-w-0">
        <header className="glass-nav sticky top-0 z-20 h-16 flex items-center gap-4 px-5">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            data-testid="btn-open-menu"
          >
            <ListIcon size={22} />
          </button>
          <div className="font-display font-bold text-lg tracking-tight">
            {conf.title}
          </div>
          <div className="ml-auto text-sm text-zinc-500">
            <span className="chip chip-blue">{user?.role?.replace("_", " ")}</span>
          </div>
        </header>
        <main className="p-6 lg:p-8 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
