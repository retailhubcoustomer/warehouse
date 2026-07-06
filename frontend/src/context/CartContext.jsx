import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const LS_KEY = "shiplink_cart";

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { shop_id: null, shop_name: null, items: [] };
    } catch {
      return { shop_id: null, shop_name: null, items: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = (shop, product) => {
    setCart((c) => {
      if (c.shop_id && c.shop_id !== shop.shop_id) {
        if (!window.confirm("Clear cart and start new order from this shop?")) return c;
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
      return items.length === 0 ? { shop_id: null, shop_name: null, items: [] } : { ...c, items };
    });
  };

  const clear = () => setCart({ shop_id: null, shop_name: null, items: [] });

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
