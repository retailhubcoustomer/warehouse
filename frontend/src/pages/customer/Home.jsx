import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { HeartButton } from "@/context/WatchlistContext";
import {
  MagnifyingGlass,
  Star,
  MapPin,
  Lightning,
  Storefront,
  ShoppingCart,
  ForkKnife,
  Pill,
  DeviceMobile,
  TShirt,
  Bread,
  Wrench,
  Armchair,
  Flower,
  BookOpen,
  Phone,
  Plant,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react";

// Category catalog — icon color pairs
const CATS = [
  { id: "all", name: "All", Icon: MapPin, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { id: "grocery", name: "Grocery", Icon: ShoppingCart, bg: "linear-gradient(135deg,#f87171,#dc2626)" },
  { id: "food", name: "Restaurant", Icon: ForkKnife, bg: "linear-gradient(135deg,#fbbf24,#f97316)" },
  { id: "pharmacy", name: "Medicine", Icon: Pill, bg: "linear-gradient(135deg,#f472b6,#db2777)" },
  { id: "electronics", name: "Electronics", Icon: DeviceMobile, bg: "linear-gradient(135deg,#334155,#0f172a)" },
  { id: "fashion", name: "Clothing", Icon: TShirt, bg: "linear-gradient(135deg,#38bdf8,#0284c7)" },
  { id: "bakery", name: "Bakery", Icon: Bread, bg: "linear-gradient(135deg,#fde047,#ca8a04)" },
  { id: "hardware", name: "Hardware", Icon: Wrench, bg: "linear-gradient(135deg,#a3a3a3,#525252)" },
  { id: "furniture", name: "Furniture", Icon: Armchair, bg: "linear-gradient(135deg,#c084fc,#7c3aed)" },
  { id: "cosmetics", name: "Cosmetics", Icon: Flower, bg: "linear-gradient(135deg,#fb7185,#e11d48)" },
  { id: "stationery", name: "Stationery", Icon: BookOpen, bg: "linear-gradient(135deg,#fb923c,#c2410c)" },
  { id: "mobile", name: "Mobile Shop", Icon: Phone, bg: "linear-gradient(135deg,#475569,#1e293b)" },
  { id: "vegetables", name: "Vegetables", Icon: Plant, bg: "linear-gradient(135deg,#4ade80,#16a34a)" },
];

const FEATURE_CARDS = [
  {
    badge: "FLAT 40% OFF",
    badgeCls: "bg-orange-500",
    title: "Today's deals",
    subtitle: "Curated offers around you",
    href: "/?filter=deals",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&q=80",
    gradient: "linear-gradient(135deg,#f97316,#dc2626)",
    testid: "card-deals",
  },
  {
    badge: "FREE",
    badgeCls: "bg-emerald-500",
    title: "Free delivery",
    subtitle: "On your first 3 orders",
    href: "/?filter=free-delivery",
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1000&q=80",
    gradient: "linear-gradient(135deg,#10b981,#065f46)",
    testid: "card-free-delivery",
  },
  {
    badge: "FROM ₹20",
    badgeCls: "bg-blue-600",
    title: "Book transport",
    subtitle: "Toto, Auto or Mini-Truck",
    href: "/transport",
    image: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=1000&q=80",
    gradient: "linear-gradient(135deg,#3b82f6,#1e3a8a)",
    testid: "card-transport",
  },
];

export default function CustomerHome() {
  const { cityId, cities } = useOutletContext();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    api
      .get(`/marketplace/shops`, {
        params: {
          city_id: cityId,
          category: category === "all" ? undefined : category,
          q: search || undefined,
        },
      })
      .then((r) => setShops(r.data))
      .finally(() => setLoading(false));
  }, [cityId, category, search]);

  const cityName = useMemo(
    () => cities?.find((c) => c.city_id === cityId)?.name || "your city",
    [cities, cityId]
  );

  const doSearch = (e) => {
    e?.preventDefault();
    // If a shop matches, jump to it, else keep filtering shops list
    document.getElementById("shops-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      {/* HERO with dark image + gradient scrim */}
      <section
        className="relative overflow-hidden bg-zinc-900"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1800&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 hero-scrim" />
        <div className="relative max-w-7xl mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24 text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md text-white text-xs font-semibold">
            <Sparkle size={12} weight="fill" className="text-orange-300" />
            <span>Now live in {cityName}</span>
          </div>
          <h1 className="mt-4 font-display font-black tracking-tight leading-[0.98] text-4xl sm:text-5xl md:text-6xl max-w-3xl">
            Your <span className="orange-text-gradient">neighbourhood</span>,<br />
            delivered in minutes.
          </h1>
          <p className="mt-4 text-white/80 max-w-xl">
            Discover every nearby local shop, grab today&rsquo;s best deals, and book a
            Toto, Auto or Mini-Truck — all from one app.
          </p>

          <form onSubmit={doSearch} className="mt-6 max-w-2xl">
            <div className="bg-white rounded-2xl flex items-center gap-2 p-2 shadow-2xl">
              <div className="pl-3">
                <MagnifyingGlass size={20} className="text-orange-500" weight="bold" />
              </div>
              <input
                data-testid="hero-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try 'biryani', 'apples', 'medicines'…"
                className="flex-1 py-2.5 outline-none text-sm sm:text-base text-zinc-900"
              />
              <button type="submit" className="btn-orange" data-testid="hero-search-btn">
                Search
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-xs font-semibold">
              <MapPin size={12} weight="fill" className="text-orange-300" /> {cityName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-xs font-semibold">
              <Lightning size={12} weight="fill" className="text-yellow-300" /> Avg. 18 min delivery
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-xs font-semibold">
              <Storefront size={12} weight="fill" className="text-emerald-300" /> {shops.length}+ local shops
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              data-testid="hero-cta-groceries"
              onClick={() => {
                setCategory("grocery");
                document.getElementById("shops-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn-orange"
            >
              Order groceries
            </button>
            <button
              data-testid="hero-cta-transport"
              onClick={() => navigate("/transport")}
              className="btn-ghost"
            >
              Book transport <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-5 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-zinc-900">
              Explore categories
            </h2>
            <div className="text-sm text-zinc-500 mt-1">
              Pick a category to discover shops near you.
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
          {CATS.map((c) => (
            <button
              key={c.id}
              data-testid={`cat-${c.id}`}
              onClick={() => setCategory(c.id)}
              className={`cat-tile ${category === c.id ? "active" : ""}`}
            >
              <div className="cat-icon" style={{ backgroundImage: c.bg }}>
                <c.Icon size={22} weight="fill" />
              </div>
              <div className="text-xs font-semibold text-zinc-800">{c.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="max-w-7xl mx-auto px-5 mt-8">
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURE_CARDS.map((f) => (
            <Link
              key={f.testid}
              to={f.href}
              data-testid={f.testid}
              className="relative overflow-hidden rounded-2xl h-40 sm:h-52 group border border-zinc-200"
              style={{ backgroundImage: f.gradient }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${f.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
              <div className={`absolute top-3 left-3 ${f.badgeCls} text-white text-[10px] font-black tracking-widest px-2 py-1 rounded-md`}>
                {f.badge}
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="font-display font-black text-xl md:text-2xl leading-none">
                  {f.title}
                </div>
                <div className="text-sm text-white/85 mt-1">{f.subtitle}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SHOPS GRID */}
      <section id="shops-section" className="max-w-7xl mx-auto px-5 mt-10 pb-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-zinc-900">
              {category === "all" ? "Popular near you" : CATS.find((c) => c.id === category)?.name}
            </h2>
            <div className="overline mt-1">
              {loading ? "LOADING…" : `${shops.length} SHOPS`}
            </div>
          </div>
          <Link
            to="/my-orders"
            className="text-sm font-semibold text-orange-600 inline-flex items-center gap-1 hover:gap-2 transition-all"
            data-testid="link-my-orders-hero"
          >
            My orders <ArrowRight size={14} />
          </Link>
        </div>

        {!loading && shops.length === 0 ? (
          <div className="border border-dashed border-zinc-300 p-10 text-center rounded-2xl">
            <Storefront size={32} className="mx-auto text-zinc-400" />
            <div className="mt-3 font-semibold">No shops in this filter yet.</div>
            <button
              onClick={() => setCategory("all")}
              className="btn-orange mt-4 py-2 px-4 text-sm"
              data-testid="btn-reset-cat"
            >
              Show all shops
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shops.map((s) => (
              <ShopCard key={s.shop_id} shop={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ShopCard({ shop }) {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <HeartButton type="shop" id={shop.shop_id} testid={`heart-shop-${shop.shop_id}`} />
      </div>
      <Link
        to={`/shops/${shop.shop_id}`}
        data-testid={`shop-${shop.shop_id}`}
        className="group block bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all"
      >
        <div className="relative aspect-[16/10] bg-zinc-100">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${shop.image_url})` }}
          />
          <div className="absolute top-2 left-2 chip chip-yellow inline-flex items-center gap-1">
            <Star size={11} weight="fill" /> {Number(shop.rating || 0).toFixed(1)}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display font-bold text-base tracking-tight text-zinc-900 leading-tight truncate">
                {shop.name}
              </div>
              <div className="text-xs text-zinc-500 mt-1 capitalize">
                {shop.category} · {shop.delivery_time_min || 30} min
              </div>
            </div>
            {shop.status && (
              <span className="chip text-[10px] py-0.5 px-2">
                {shop.status === "open" ? "🟢" : shop.status === "busy" ? "🟡" : "🔴"}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            <MapPin size={12} weight="duotone" />
            <span className="truncate">{shop.address}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
