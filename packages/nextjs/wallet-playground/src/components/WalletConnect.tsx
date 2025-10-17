"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@ui/separator";
import { Skeleton } from "@ui/skeleton";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const portoConnector = connectors.find((c) => c.id === "xyz.ithaca.porto");

  if (!mounted) {
    return <Skeleton className="w-40 h-8" />;
  }

  if (!portoConnector) {
    return null;
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <p>
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>

          <Separator orientation="vertical" className="min-h-4" />

          <p className="text-muted-foreground">
            {balance ? Number(formatEther(balance.value)).toFixed(4) : "0.0000"}{" "}
            <span className="font-bold">{balance?.symbol ?? "ETH"}</span>
          </p>
        </div>
        <Separator orientation="vertical" className="min-h-6" />
        <Button onClick={() => disconnect()} variant="outline">
          Disconnect
        </Button>
      </div>
    );
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
