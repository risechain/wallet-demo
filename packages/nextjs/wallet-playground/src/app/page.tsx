'use client'

import { ConnectButton } from "@/components/ConnectButton";
import { TransferWidgetSimple } from "@/components/TransferWidgetSimple";
import { SwapWidget } from "@/components/SwapWidget";
import { MintButtonSimple } from "@/components/MintButtonSimple";
import { SessionKeyManager } from "@/components/SessionKeyManager";
import { useState } from "react";

type WidgetType = 'transfer' | 'swap' | 'mint' | 'keys';

export default function Home() {
  const [activeWidget, setActiveWidget] = useState<WidgetType>('transfer');

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveWidget('transfer')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeWidget === 'transfer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                Transfer
              </button>
              <button
                onClick={() => setActiveWidget('swap')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeWidget === 'swap'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                Swap
              </button>
              <button
                onClick={() => setActiveWidget('mint')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeWidget === 'mint'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                Mint
              </button>
              <button
                onClick={() => setActiveWidget('keys')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeWidget === 'keys'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                🔑 Keys
              </button>
            </div>

            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Active Widget */}
        <div className="max-w-md mx-auto">
          {activeWidget === 'transfer' && <TransferWidgetSimple />}
          {activeWidget === 'swap' && <SwapWidget />}
          {activeWidget === 'mint' && (
            <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
              <h3 className="text-lg font-semibold mb-6 text-white">Mint Tokens</h3>
              <p className="text-gray-400 mb-6">
                Mint MockUSD and MockToken for testing. Each address can mint once.
              </p>
              <MintButtonSimple />
            </div>
          )}
          {activeWidget === 'keys' && <SessionKeyManager />}
        </div>
      </main>
    </div>
  );
}
