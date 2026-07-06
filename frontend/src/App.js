import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import DashboardLayout from "@/components/DashboardLayout";
import PublicLayout from "@/components/PublicLayout";
import PartnerLayout from "@/components/PartnerLayout";

// pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CustomerHome from "@/pages/customer/Home";
import ShopDetail from "@/pages/customer/ShopDetail";
import Cart from "@/pages/customer/Cart";
import { MyOrders, OrderDetail } from "@/pages/customer/Orders";

import AdminOverview from "@/pages/admin/Overview";
import LiveMap from "@/pages/admin/LiveMap";
import {
  AdminCities, AdminWarehouses, AdminUsers, AdminKYC, AdminShops,
  AdminOrdersPage, AdminCoupons, AdminAds,
} from "@/pages/admin/AdminPages";

import {
  WarehouseOverview, WarehouseOrders, WarehousePacking,
  WarehouseInventory, WarehouseStaff,
} from "@/pages/warehouse/WarehousePages";

import { ShopOverview, ShopProducts, ShopOrders } from "@/pages/shop/ShopPages";

import {
  DeliveryActive, DeliveryHistory, DeliveryStats,
  CollectionActive, CollectionHistory, CollectionStats,
} from "@/pages/partner/PartnerPages";

// Detect OAuth callback in hash — process BEFORE route rendering
function Router() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Auth screens */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Public marketplace (customers) */}
      <Route element={<PublicLayout />}>
        <Route index element={<CustomerHome />} />
        <Route path="/shops/:shopId" element={<ShopDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/my-orders" element={
          <ProtectedRoute roles={["customer", "shop_owner", "super_admin",
                                    "warehouse_manager", "delivery_partner",
                                    "collection_partner"]}>
            <MyOrders />
          </ProtectedRoute>
        } />
        <Route path="/my-orders/:orderId" element={
          <ProtectedRoute><OrderDetail /></ProtectedRoute>
        } />
      </Route>

      {/* Super Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={["super_admin"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminOverview />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="warehouses" element={<AdminWarehouses />} />
        <Route path="shops" element={<AdminShops />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="kyc" element={<AdminKYC />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="ads" element={<AdminAds />} />
      </Route>

      {/* Warehouse Manager */}
      <Route path="/warehouse" element={
        <ProtectedRoute roles={["warehouse_manager"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<WarehouseOverview />} />
        <Route path="orders" element={<WarehouseOrders />} />
        <Route path="packing" element={<WarehousePacking />} />
        <Route path="inventory" element={<WarehouseInventory />} />
        <Route path="staff" element={<WarehouseStaff />} />
      </Route>

      {/* Shop Owner (mocked shop-app view living inside the marketplace) */}
      <Route path="/shop" element={
        <ProtectedRoute roles={["shop_owner"]}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<ShopOverview />} />
        <Route path="products" element={<ShopProducts />} />
        <Route path="orders" element={<ShopOrders />} />
      </Route>

      {/* Delivery partner (mobile) */}
      <Route path="/delivery" element={
        <ProtectedRoute roles={["delivery_partner"]}>
          <PartnerLayout role="delivery_partner" />
        </ProtectedRoute>
      }>
        <Route index element={<DeliveryActive />} />
        <Route path="history" element={<DeliveryHistory />} />
        <Route path="stats" element={<DeliveryStats />} />
      </Route>

      {/* Collection partner (mobile) */}
      <Route path="/collection" element={
        <ProtectedRoute roles={["collection_partner"]}>
          <PartnerLayout role="collection_partner" />
        </ProtectedRoute>
      }>
        <Route index element={<CollectionActive />} />
        <Route path="history" element={<CollectionHistory />} />
        <Route path="stats" element={<CollectionStats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Router />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
