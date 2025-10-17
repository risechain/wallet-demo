"use client";

import { ConnectInfo } from "@/components/ConnectInfo";
import { MintButtonSimple } from "@/components/MintButtonSimple";
import { useAccount } from "wagmi";

export default function MintPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <ConnectInfo label="Mint Token" />;
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
      <h3 className="text-lg font-semibold mb-6 text-white">Mint Tokens</h3>
      <p className="text-gray-400 mb-6">
        Mint MockUSD and MockToken for testing. Each address can mint once.
      </p>
      <MintButtonSimple />
    </div>
  );
}
