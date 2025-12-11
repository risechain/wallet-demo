"use client";

import { Button } from "@/components/ui/button";
import { config } from "@/config/wagmi";
import { Separator } from "@ui/separator";
import { Skeleton } from "@ui/skeleton";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Actions } from "rise-wallet/wagmi";
import { formatEther } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fix hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const portoConnector = connectors.find(
    (c) => c.id === "com.risechain.wallet"
  );

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
          <Button
            onClick={handleCopy}
            className="hover:bg-accent rounded p-1 transition-colors size-4"
            title="Copy address"
            variant="ghost"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
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
        <Button
          onClick={() => {
            Actions.disconnect(config);

            disconnect();
          }}
          variant="outline"
        >
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
