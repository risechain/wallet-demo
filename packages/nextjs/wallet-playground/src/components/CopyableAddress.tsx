"use client";

import { useState } from "react";
import { Button } from "./ui/button";

interface CopyableAddressProps {
  address: string;
  className?: string;
  prefix?: number;
  suffix?: number;
  showCopyIcon?: boolean;
}

export function CopyableAddress({
  address,
  className = "",
  prefix = 6,
  suffix = 4,
  showCopyIcon = true,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const shortenedAddress = `${address.slice(0, prefix)}...${address.slice(-suffix)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="font-mono text-sm">{shortenedAddress}</span>
      {showCopyIcon && (
        <Button
          onClick={(e) => {
            e.preventDefault();
            handleCopy();
          }}
          variant="secondary"
          className="h-6 w-6 rounded-full"
          title={copied ? "Copied!" : "Copy full address"}
        >
          {copied ? (
            <svg
              className="w-3 h-3 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-3 h-3 text-gray-400 hover:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </Button>
      )}
    </div>
  );
}
