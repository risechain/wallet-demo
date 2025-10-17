"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { TransferWidgetSimple } from "@/components/TransferWidgetSimple";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function TransferPage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isConnected || !isMounted) {
    return <ConnectInfo label="Transfer" />;
  }

  return <TransferWidgetSimple />;
}
