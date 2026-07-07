import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CartContext = createContext(null);
const LS_KEY = "shiplink_cart";
const EMPTY = { shop_id: null, shop_name: null, items: [] };

/**
 * Cart is persisted in the backend when the user is authenticated
 * and mirrored in localStorage for guest usage / offline resilience.
 */
export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { ...EMPTY };
    } catch {
      return { ...EMPTY };
    }
  });
  const suppressSync = useRef(false); // avoid PUT loops on hydration

  // Always mirror to localStorage so guest carts survive reloads
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(cart));
  }, [cart]);

  // On login: merge local cart into backend cart (backend wins if both present)
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const { data: remote } = await api.get("/cart");
        const hasLocal = cart.items.length > 0;
        const hasRemote = (remote?.items?.length || 0) > 0;
        if (hasRemote) {
          suppressSync.current = true;
          if (active) setCart({ shop_id: remote.shop_id, shop_name: remote.shop_name, items: remote.items });
        } else if (hasLocal) {
          await api.put("/cart", cart);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  // Debounced sync to backend on every cart change (only when logged in)
  useEffect(() => {
    if (!user) return;
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    const t = setTimeout(() => {
      api.put("/cart", cart).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [cart, user]);

  const addItem = (shop, product) => {
    setCart((c) => {
      if (c.shop_id && c.shop_id !== shop.shop_id) {
        if (!window.confirm("Clear cart and start a new order from this shop?")) return c;
        return { shop_id: shop.shop_id, shop_name: shop.name, items: [toItem(product)] };
      }
      const existing = c.items.find((i) => i.product_id === product.product_id);
      const items = existing
        ? c.items.map((i) =>
            i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i
          )
        : [...c.items, toItem(product)];
      return { shop_id: shop.shop_id, shop_name: shop.name, items };
    });
  };

  const updateQty = (product_id, delta) => {
    setCart((c) => {
      const items = c.items
        .map((i) => (i.product_id === product_id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0);
      return items.length === 0 ? { ...EMPTY } : { ...c, items };
    });
  };

  const clear = () => {
    setCart({ ...EMPTY });
    if (user) api.delete("/cart").catch(() => {});
  };

  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

function toItem(p) {
  return {
    product_id: p.product_id,
    name: p.name,
    price: p.price,
    qty: 1,
    image_url: p.image_url,
  };
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
