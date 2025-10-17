"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { SwapWidget } from "@/components/SwapWidget";
import { useAccount } from "wagmi";

export default function SwapPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectInfo label="Swap" />;
  }

  return <SwapWidget />;
}
