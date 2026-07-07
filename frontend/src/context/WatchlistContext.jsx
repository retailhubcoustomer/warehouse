import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const WatchlistContext = createContext(null);

/**
 * Central watchlist state (shops / products / transport / helpers).
 * Keeps a lightweight `ids` map for fast heart-toggle UI.
 */
export function WatchlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState({ shop: [], product: [], transport: [], helper: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds({ shop: [], product: [], transport: [], helper: [] });
      return;
    }
    try {
      const { data } = await api.get("/marketplace/watchlist/ids");
      setIds({ shop: [], product: [], transport: [], helper: [], ...data });
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isSaved = (type, id) => (ids[type] || []).includes(id);

  const toggle = async (type, id) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    // optimistic
    setIds((prev) => {
      const list = prev[type] || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, [type]: next };
    });
    try {
      setLoading(true);
      await api.post("/marketplace/watchlist/toggle", {
        entity_type: type, entity_id: id,
      });
    } catch {
      // rollback
      refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <WatchlistContext.Provider value={{ ids, isSaved, toggle, loading, refresh }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}

export function HeartButton({ type, id, size = 18, className = "", testid }) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(type, id);
  return (
    <button
      type="button"
      data-testid={testid || `heart-${type}-${id}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(type, id);
      }}
      aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
      className={`inline-flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md border border-zinc-200 hover:border-red-300 shadow-sm w-9 h-9 transition ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            width={size} height={size}
            fill={saved ? "#ef4444" : "none"}
            stroke={saved ? "#ef4444" : "#71717a"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
