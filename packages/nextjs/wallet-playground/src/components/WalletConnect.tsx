"use client";

import {
  useConnect,
  useAccount,
  useDisconnect,
  useConnectors,
  useBalance,
} from "wagmi";
import { formatEther } from "viem";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "./ui/separator";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { data: balance } = useBalance({ address });
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const portoConnector = connectors.find((c) => c.id === "xyz.ithaca.porto");

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted) {
    return (
      <button
        disabled
        className="px-6 py-2 bg-background text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <p>
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          {balance && (
            <>
              <Separator orientation="vertical" className="min-h-4" />
              <p className="text-muted-foreground">
                {Number(formatEther(balance.value)).toFixed(4)}{" "}
                <span className="font-bold">{balance.symbol}</span>
              </p>
            </>
          )}
        </div>
        <Separator orientation="vertical" className="min-h-6" />
        <Button onClick={() => disconnect()} variant="outline">
          Disconnect
        </Button>
      </div>
    );
  }

  if (!portoConnector) {
    return null;
  }

  return (
    <Button
      onClick={() => connect({ connector: portoConnector })}
      disabled={isPending}
      className="min-w-40"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
