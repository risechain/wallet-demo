"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { SessionKeyManager } from "@/components/SessionKeyManager";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export default function SessionKeysPage() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isConnected || !isMounted) {
    return <ConnectInfo label="Manage your Keys" />;
  }

  return <SessionKeyManager />;
}
