import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { INR } from "@/components/UIBits";
import { Plus, Minus, Star, MapPin } from "@phosphor-icons/react";

export default function ShopDetail() {
  const { shopId } = useParams();
  const [data, setData] = useState(null);
  const { cart, addItem, updateQty } = useCart();

  useEffect(() => {
    api.get(`/marketplace/shops/${shopId}`).then((r) => setData(r.data));
  }, [shopId]);

  if (!data) return <div className="p-10 text-center text-zinc-500">Loading shop…</div>;
  const { shop, products } = data;

  const qty = (pid) => cart.items.find((i) => i.product_id === pid)?.qty || 0;

  return (
    <div>
      <div
        className="h-64 bg-cover bg-center border-b border-zinc-200"
        style={{ backgroundImage: `url(${shop.image_url})` }}
      />
      <div className="max-w-7xl mx-auto px-5 -mt-16 relative pb-16">
        <div className="bg-white border border-zinc-200 p-6" data-testid={`shop-detail-${shop.shop_id}`}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="overline">{shop.category?.toUpperCase()} SHOP</div>
              <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
                {shop.name}
              </h1>
              <div className="mt-2 text-sm text-zinc-500 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Star size={14} weight="fill" className="text-[#ecc94b]" /> {Number(shop.rating).toFixed(1)} · {shop.reviews_count} reviews
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {shop.address}
                </span>
                <span className="chip chip-blue">{shop.business_hours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.product_id} data-testid={`product-${p.product_id}`} className="sharp-card">
              <div
                className="aspect-square bg-zinc-100 bg-cover bg-center"
                style={{ backgroundImage: `url(${p.image_url})` }}
              />
              <div className="p-3">
                <div className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5 capitalize">{p.category}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-display font-extrabold text-lg">
                    <INR value={p.price} />
                  </div>
                  {qty(p.product_id) === 0 ? (
                    <button
                      data-testid={`add-${p.product_id}`}
                      className="btn-primary py-1.5 px-3 text-xs"
                      onClick={() => addItem(shop, p)}
                    >
                      Add
                    </button>
                  ) : (
                    <div className="inline-flex items-center border border-zinc-300 rounded-md">
                      <button
                        className="p-1.5"
                        onClick={() => updateQty(p.product_id, -1)}
                        data-testid={`dec-${p.product_id}`}
                      >
                        <Minus size={12} />
                      </button>
                      <div className="px-2 font-mono text-sm" data-testid={`qty-${p.product_id}`}>
                        {qty(p.product_id)}
                      </div>
                      <button
                        className="p-1.5"
                        onClick={() => addItem(shop, p)}
                        data-testid={`inc-${p.product_id}`}
                      >
                        <Plus size={12} />
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
  );
}
