"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { SwapWidget } from "@/components/SwapWidget";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isConnected || !isMounted) {
    return <ConnectInfo label="Swap" />;
  }

  return <SwapWidget />;
}
