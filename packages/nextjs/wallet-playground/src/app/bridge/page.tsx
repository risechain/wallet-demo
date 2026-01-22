"use client";

import { Bridge } from "@/components/Bridge";
import { ConnectInfo } from "@/components/ConnectInfo";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function BridgePage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isConnected || !isMounted) {
    return <ConnectInfo label="Bridge" />;
  }

  return <Bridge />;
}
