"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { Mint } from "@/components/Mint";
import { TransactionHeader } from "@/components/TransactionHeader";
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
      <CardHeader>
        <TransactionHeader label="Mint Test Tokens" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Mint />
      </CardContent>
    </Card>
  );
}
