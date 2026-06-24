import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns true for valid EVM addresses (0x + 40 hex chars) */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/** Shortens an address to 0x1234...abcd format */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ""
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`
}

/** Formats an ISO date string to "12 Apr 2024" */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unavailable"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Unavailable"
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "Unavailable"
  }
}

