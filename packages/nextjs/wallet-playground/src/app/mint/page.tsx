"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { Mint } from "@/components/Mint";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function MintPage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isConnected || !isMounted) {
    return <ConnectInfo label="Mint Token" />;
  }

  return (
    <Card>
      <CardHeader>Mint Test Tokens</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Mint MockUSD and MockToken for testing. Each address can mint{" "}
          <span className="font-bold">1,000</span> per token.
        </p>
        <Mint />
      </CardContent>
    </Card>
  );
}
