import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { INR, StatusBadge, EmptyState } from "@/components/UIBits";
import MapView from "@/components/MapView";
import { Star, Package } from "@phosphor-icons/react";

export function MyOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    api.get("/marketplace/orders").then((r) => setOrders(r.data));
  }, []);
  if (orders === null) return <div className="p-10 text-center text-zinc-500">Loading…</div>;
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display font-black text-4xl tracking-tight">My orders</h1>
      <div className="overline mt-2">TRACK · REORDER · RATE</div>
      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="You haven't placed any orders yet" description="Start shopping now" icon={Package} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.order_id}
              to={`/my-orders/${o.order_id}`}
              data-testid={`order-${o.order_id}`}
              className="sharp-card flex items-center gap-4 p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-mono text-xs text-zinc-500">#{o.order_id.slice(-8).toUpperCase()}</div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="font-semibold mt-1">{o.shop_name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {o.items.length} items · via {o.warehouse_name}
                </div>
              </div>
              <div className="font-display font-extrabold text-lg">
                <INR value={o.total} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetail() {
  const { orderId } = useParams();
  const [o, setO] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);

  const load = () => api.get(`/marketplace/orders/${orderId}`).then((r) => setO(r.data));
  useEffect(() => { load(); }, [orderId]);

  if (!o) return <div className="p-10 text-center text-zinc-500">Loading…</div>;

  const rate = async () => {
    await api.post(`/marketplace/orders/${orderId}/rate`, { rating, review });
    setSaved(true);
    load();
  };

  const markers = [
    { lat: o.delivery_lat, lng: o.delivery_lng, type: "customer", label: "You",
      popupHtml: `<b>Delivery address</b><br/>${o.delivery_address}` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="overline">ORDER · {o.order_id}</div>
      <h1 className="font-display font-black text-4xl tracking-tight mt-1">
        {o.shop_name}
      </h1>
      <div className="mt-2">
        <StatusBadge status={o.status} />
        <span className="chip ml-2">{o.payment_method?.toUpperCase()} · {o.payment_status}</span>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="border border-zinc-200 p-4">
          <div className="overline">FROM</div>
          <div className="font-semibold mt-1">{o.shop_name}</div>
        </div>
        <div className="border border-zinc-200 p-4">
          <div className="overline">ROUTED VIA</div>
          <div className="font-semibold mt-1">{o.warehouse_name}</div>
        </div>
        <div className="border border-zinc-200 p-4">
          <div className="overline">DELIVER TO</div>
          <div className="text-sm mt-1">{o.delivery_address}</div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="border border-zinc-200 p-4">
          <div className="overline">TIMELINE</div>
          <ol className="mt-3 relative border-l border-zinc-200 pl-4 space-y-4">
            {o.timeline?.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#002fa7]" />
                <div className="text-sm font-semibold capitalize">{t.status?.replace(/_/g, " ")}</div>
                <div className="text-xs text-zinc-500">{t.note}</div>
                <div className="text-xs text-zinc-400 font-mono">{new Date(t.at).toLocaleString()}</div>
              </li>
            ))}
          </ol>
        </div>
        <div className="border border-zinc-200 min-h-[320px]">
          <MapView markers={markers} center={[o.delivery_lat, o.delivery_lng]} zoom={13} />
        </div>
      </div>

      <div className="mt-6 border border-zinc-200 p-4">
        <div className="overline mb-3">ITEMS</div>
        <div className="divide-y divide-zinc-200">
          {o.items.map((i, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-zinc-500">Qty {i.qty} · <INR value={i.price} /></div>
              </div>
              <div className="font-mono"><INR value={i.qty * i.price} /></div>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-200 mt-3 pt-3 grid grid-cols-2 gap-2 text-sm">
          <div>Subtotal</div><div className="text-right font-mono"><INR value={o.subtotal} /></div>
          <div>Delivery</div><div className="text-right font-mono"><INR value={o.delivery_fee} /></div>
          {o.discount > 0 && <><div>Discount</div><div className="text-right font-mono text-green-600">- <INR value={o.discount} /></div></>}
          <div className="font-display font-black text-lg">Total</div>
          <div className="text-right font-display font-black text-lg"><INR value={o.total} /></div>
        </div>
      </div>

      {o.status === "delivered" && !o.rating && (
        <div className="mt-6 border border-zinc-200 p-4" data-testid="rate-block">
          <div className="overline mb-2">RATE YOUR EXPERIENCE</div>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`}>
                <Star size={22} weight={n <= rating ? "fill" : "regular"} className="text-[#ecc94b]" />
              </button>
            ))}
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="w-full border border-zinc-300 p-2 text-sm rounded-md"
            placeholder="Tell us how it went…"
            rows={2}
          />
          <button className="btn-primary mt-3" onClick={rate} disabled={!rating || saved} data-testid="btn-submit-rating">
            {saved ? "Thanks!" : "Submit rating"}
          </button>
        </div>
      )}
      {o.rating && (
        <div className="mt-6 border border-zinc-200 p-4">
          <div className="overline mb-2">YOUR RATING</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={20} weight={n <= o.rating ? "fill" : "regular"} className="text-[#ecc94b]" />
            ))}
          </div>
          {o.review && <div className="text-sm text-zinc-600 mt-2">&ldquo;{o.review}&rdquo;</div>}
        </div>
      )}
    </div>
  );
}
