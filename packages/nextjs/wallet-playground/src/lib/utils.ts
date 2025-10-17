import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Masks an Ethereum address by showing only the first and last few characters
 * @param address - The full address to mask
 * @param startLength - Number of characters to show at the start (default: 6)
 * @param endLength - Number of characters to show at the end (default: 4)
 * @returns Masked address string (e.g., "0x1234...5678")
 */
export function maskAddress(
  address: string | undefined,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return "";

  if (address.length <= startLength + endLength) {
    return address;
  }

  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Shorthand for maskAddress with common defaults
 * @param address - The full address to mask
 * @returns Masked address string (e.g., "0x1234...5678")
 */
export function shortAddress(address: string | undefined): string {
  return maskAddress(address, 6, 4);
}
