import { TransactionCall } from "@/hooks/useTransaction";
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
  endLength: number = 4,
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

export function extractContractAddresses(calls: TransactionCall[]): string[] {
  return calls.map((call) => call.to.toLowerCase()).filter(Boolean);
}

export namespace ErrorFormatter {
  /**
   * Extracts the actual error message from an error string.
   * Looks for "Details:" or "Caused by:" patterns and returns the first sentence.
   *
   * @param errorMessage - The error message string to parse.
   * @returns The extracted error message or the original message if no pattern is found.
   */
  export function extractMessage(errorMessage: string): string {
    // Look for "Details:" or "Caused by:" patterns (case-insensitive)
    const detailsRegex = /Details:\s*(.+?)(?:\.|$)/i;
    const causedByRegex = /Caused by:\s*(.+?)(?:\.|$)/i;

    const detailsMatch = detailsRegex.exec(errorMessage);
    if (detailsMatch?.[1]) {
      return detailsMatch[1].trim();
    }

    const causedByMatch = causedByRegex.exec(errorMessage);
    if (causedByMatch?.[1]) {
      return causedByMatch[1].trim();
    }

    // If no pattern found, return the first sentence of the original message
    const firstSentenceRegex = /^(.+?)(?:\.|$)/;
    const firstSentence = firstSentenceRegex.exec(errorMessage);
    return firstSentence?.[1]?.trim() || errorMessage;
  }
}
