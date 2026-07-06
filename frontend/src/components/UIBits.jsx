import React from "react";

export function StatusBadge({ status }) {
  const cls = {
    placed: "chip-blue",
    accepted: "chip-blue",
    collected: "chip-yellow",
    at_warehouse: "chip-yellow",
    packed: "chip-yellow",
    out_for_delivery: "chip-blue",
    delivered: "chip-green",
    cancelled: "chip-red",
    pending: "chip-yellow",
    approved: "chip-green",
    rejected: "chip-red",
    paid: "chip-green",
  }[status] || "";
  return <span className={`chip ${cls}`}>{String(status || "").replace(/_/g, " ")}</span>;
}

export function StatTile({ label, value, hint, testid }) {
  return (
    <div className="grid-tile animate-fade-up" data-testid={testid}>
      <div className="tile-label">{label}</div>
      <div className="tile-metric mt-1">{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, icon: Icon }) {
  return (
    <div className="border border-dashed border-zinc-300 p-10 text-center bg-white">
      {Icon && (
        <div className="inline-flex items-center justify-center h-12 w-12 border border-zinc-200 mb-3">
          <Icon size={22} weight="duotone" className="text-zinc-500" />
        </div>
      )}
      <div className="font-display font-bold text-lg tracking-tight">{title}</div>
      {description && <div className="text-sm text-zinc-500 mt-1">{description}</div>}
    </div>
  );
}

export function INR({ value }) {
  return <span className="font-mono">₹{Number(value || 0).toLocaleString("en-IN")}</span>;
}
