import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";
import { INR } from "@/components/UIBits";
import { Minus, Plus } from "@phosphor-icons/react";

export default function Cart() {
  const { cart, updateQty, clear, total } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [address, setAddress] = useState("");
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState("cod");

  const place = async () => {
    setError("");
    if (!user) {
      nav("/login", { state: { from: "/cart" } });
      return;
    }
    if (!address) {
      setError("Please enter delivery address");
      return;
    }
    setBusy(true);
    try {
      // Use user's city coords or default; MVP: use random near shop
      const lat = (user.lat || 22.5726) + (Math.random() - 0.5) * 0.02;
      const lng = (user.lng || 88.3639) + (Math.random() - 0.5) * 0.02;
      const { data } = await api.post("/marketplace/orders", {
        shop_id: cart.shop_id,
        items: cart.items,
        delivery_address: address,
        delivery_lat: lat,
        delivery_lng: lng,
        payment_method: payment,
        coupon_code: coupon || undefined,
      });
      if (payment === "razorpay") {
        // MOCK payment
        const { data: rzp } = await api.post("/payments/create-order", { order_id: data.order_id });
        await api.post("/payments/verify", {
          order_id: data.order_id,
          razorpay_order_id: rzp.razorpay_order_id,
          razorpay_payment_id: "pay_mock_" + Date.now(),
        });
      }
      clear();
      nav(`/my-orders/${data.order_id}`);
    } catch (e) {
      setError(formatError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 px-5">
        <h1 className="font-display font-black text-4xl tracking-tight">Your cart is empty</h1>
        <p className="text-zinc-500 mt-2">Explore shops and add products to place your first order.</p>
        <Link to="/" className="btn-primary inline-block mt-6" data-testid="link-continue-shopping">
          Continue shopping
        </Link>
      </div>
    );
  }

  const subtotal = total;
  const delivery = 30;
  const grand = subtotal + delivery;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="font-display font-black text-4xl tracking-tight">Cart</h1>
        <div className="overline mt-2">FROM {cart.shop_name?.toUpperCase()}</div>
        <div className="mt-6 divide-y divide-zinc-200 border border-zinc-200">
          {cart.items.map((i) => (
            <div key={i.product_id} data-testid={`cart-item-${i.product_id}`} className="flex items-center gap-4 p-4">
              <div
                className="w-16 h-16 bg-zinc-100 bg-cover bg-center"
                style={{ backgroundImage: `url(${i.image_url})` }}
              />
              <div className="flex-1">
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  <INR value={i.price} /> each
                </div>
              </div>
              <div className="inline-flex items-center border border-zinc-300 rounded-md">
                <button className="p-1.5" onClick={() => updateQty(i.product_id, -1)}>
                  <Minus size={12} />
                </button>
                <div className="px-3 font-mono text-sm">{i.qty}</div>
                <button className="p-1.5" onClick={() => updateQty(i.product_id, 1)}>
                  <Plus size={12} />
                </button>
              </div>
              <div className="font-display font-extrabold text-lg w-24 text-right">
                <INR value={i.price * i.qty} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="border border-zinc-200 p-5 sticky top-24">
          <div className="overline">CHECKOUT</div>
          <label className="overline block mt-4 mb-1">Delivery address</label>
          <textarea
            data-testid="input-delivery-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Building, street, area, PIN"
            rows={3}
            className="w-full border border-zinc-300 p-2 text-sm rounded-md"
          />
          <label className="overline block mt-4 mb-1">Coupon</label>
          <input
            data-testid="input-coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
            className="w-full border border-zinc-300 p-2 text-sm rounded-md"
          />
          <label className="overline block mt-4 mb-2">Payment</label>
          <div className="grid grid-cols-2 gap-2">
            {[["cod", "Cash on Delivery"], ["razorpay", "Razorpay (mock)"]].map(([id, l]) => (
              <button
                key={id}
                data-testid={`pay-${id}`}
                onClick={() => setPayment(id)}
                className={`p-2 border text-xs font-semibold rounded-md ${
                  payment === id ? "border-[#002fa7] bg-[#f2f5ff] text-[#002fa7]" : "border-zinc-200"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-1 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span> <INR value={subtotal} />
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Delivery</span> <INR value={delivery} />
            </div>
            <div className="flex justify-between font-display font-black text-xl mt-2">
              <span>Total</span> <INR value={grand} />
            </div>
          </div>
          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
          <button
            data-testid="btn-place-order"
            className="btn-primary w-full mt-4"
            disabled={busy}
            onClick={place}
          >
            {busy ? "Placing…" : "Place order"}
          </button>
          <div className="text-xs text-zinc-400 mt-2">
            Auto-routed to nearest warehouse via OpenStreetMap.
          </div>
        </div>
      </div>
    </div>
  );
}
