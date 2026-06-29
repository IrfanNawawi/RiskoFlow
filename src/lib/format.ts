/** Rupiah as integer, no decimals (PRD currency constraint). */
export function idr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact rupiah for KPI tiles, e.g. Rp 1,2 M. */
export function idrCompact(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return idr(value);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDays(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung className kondisional + selesaikan konflik utility Tailwind (dipakai juga shadcn/ui). */
export function cn(...parts: ClassValue[]): string {
  return twMerge(clsx(parts));
}
