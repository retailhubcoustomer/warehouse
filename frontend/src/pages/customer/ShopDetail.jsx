import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { HeartButton } from "@/context/WatchlistContext";
import { INR } from "@/components/UIBits";
import { Plus, Minus, Star, MapPin, Phone, WhatsappLogo, Clock, Truck, ArrowLeft } from "@phosphor-icons/react";

const STATUS = {
  open: { dot: "🟢", label: "Open Now", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  busy: { dot: "🟡", label: "Busy", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  closed: { dot: "🔴", label: "Closed", cls: "text-red-700 bg-red-50 border-red-200" },
};

export default function ShopDetail() {
  const { shopId } = useParams();
  const [data, setData] = useState(null);
  const { cart, addItem, updateQty } = useCart();

  useEffect(() => {
    api.get(`/marketplace/shops/${shopId}`).then((r) => setData(r.data));
  }, [shopId]);

  if (!data)
    return (
      <div className="p-10 text-center text-zinc-500">Loading shop…</div>
    );
  const { shop, products } = data;
  const qty = (pid) => cart.items.find((i) => i.product_id === pid)?.qty || 0;
  const status = STATUS[shop.status] || STATUS.open;
  const phoneClean = (shop.phone || "").replace(/[^0-9]/g, "");

  return (
    <div>
      {/* HERO */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${shop.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-white/90 hover:bg-white text-zinc-800 px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md"
            data-testid="link-back"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <HeartButton type="shop" id={shop.shop_id} testid={`heart-shop-detail-${shop.shop_id}`} />
        </div>
      </div>

      {/* CARD */}
      <div className="max-w-6xl mx-auto px-5 -mt-16 relative pb-16">
        <div
          className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-orange-500/5 p-6 md:p-7"
          data-testid={`shop-detail-${shop.shop_id}`}
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-orange-600">
                {shop.category?.toUpperCase()} SHOP
              </div>
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-zinc-900 mt-1">
                {shop.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  data-testid="shop-status"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${status.cls}`}
                >
                  {status.dot} {status.label}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-700">
                  <Star size={12} weight="fill" className="text-amber-400" />
                  {Number(shop.rating).toFixed(1)}
                  <span className="text-zinc-400 font-normal">({shop.reviews_count})</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-700">
                  <Truck size={12} className="text-orange-500" weight="fill" />
                  {shop.delivery_time_min || 30} min delivery
                </span>
              </div>
            </div>

            {shop.phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${shop.phone}`}
                  data-testid="btn-call-shop"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-zinc-200 hover:border-orange-400 font-semibold text-sm text-zinc-800"
                >
                  <Phone size={14} weight="fill" className="text-orange-500" /> Call
                </a>
                <a
                  href={`https://wa.me/${phoneClean}`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="btn-wa-shop"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm"
                >
                  <WhatsappLogo size={14} weight="fill" /> WhatsApp
                </a>
              </div>
            )}
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3 text-sm">
            <InfoRow icon={MapPin} label="Address" value={shop.address} />
            <InfoRow
              icon={Clock}
              label="Hours"
              value={`${shop.opening_hours || "9:00 AM"} — ${shop.closing_hours || "10:00 PM"}`}
            />
            {shop.phone && (
              <InfoRow icon={Phone} label="Phone" value={shop.phone} testid="shop-phone" />
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-display font-black text-2xl tracking-tight text-zinc-900">
                Menu
              </h2>
              <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest">
                {products.length} items
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.product_id}
                data-testid={`product-${p.product_id}`}
                className="relative bg-white rounded-2xl border border-zinc-200 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10 transition-all overflow-hidden group"
              >
                <div className="absolute top-3 right-3 z-10">
                  <HeartButton type="product" id={p.product_id} testid={`heart-prd-${p.product_id}`} />
                </div>
                <div
                  className="aspect-square bg-zinc-100 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${p.image_url})` }}
                />
                <div className="p-3.5">
                  <div className="font-semibold text-sm leading-tight line-clamp-2 text-zinc-900">
                    {p.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 capitalize">{p.category}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-display font-extrabold text-lg text-zinc-900">
                      <INR value={p.price} />
                    </div>
                    {qty(p.product_id) === 0 ? (
                      <button
                        data-testid={`add-${p.product_id}`}
                        className="btn-orange py-1 px-3 text-xs"
                        onClick={() => addItem(shop, p)}
                      >
                        Add
                      </button>
                    ) : (
                      <div className="inline-flex items-center border border-orange-300 bg-orange-50 rounded-full">
                        <button
                          className="p-1.5 text-orange-600"
                          onClick={() => updateQty(p.product_id, -1)}
                          data-testid={`dec-${p.product_id}`}
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <div
                          className="px-2 font-mono text-sm text-orange-700 font-bold"
                          data-testid={`qty-${p.product_id}`}
                        >
                          {qty(p.product_id)}
                        </div>
                        <button
                          className="p-1.5 text-orange-600"
                          onClick={() => addItem(shop, p)}
                          data-testid={`inc-${p.product_id}`}
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, testid }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50">
      <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
        <Icon size={16} weight="duotone" className="text-orange-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
          {label}
        </div>
        <div className="text-sm font-semibold text-zinc-900 mt-0.5 truncate" data-testid={testid}>
          {value}
        </div>
      </div>
    </div>
  );
}
