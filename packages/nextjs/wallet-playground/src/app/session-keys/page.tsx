"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { SessionKeyManager } from "@/components/SessionKeyManager";
import { useAccount } from "wagmi";

export default function SessionKeysPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectInfo label="Manage your Keys" />;
  }

  return <SessionKeyManager />;
}
