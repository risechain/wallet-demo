"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { TransferWidgetSimple } from "@/components/TransferWidgetSimple";
import { useAccount } from "wagmi";

export default function TransferPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectInfo label="Transfer" />;
  }

  return <TransferWidgetSimple />;
}
