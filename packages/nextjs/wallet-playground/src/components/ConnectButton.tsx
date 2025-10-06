'use client'

import { useConnect, useAccount, useDisconnect, useConnectors, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { useEffect, useState } from 'react'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const connectors = useConnectors()
  const { data: balance } = useBalance({ address })
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const portoConnector = connectors.find(c => c.id === 'xyz.ithaca.porto')

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted) {
    return (
      <button
        disabled
        className="px-6 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-sm">
          <div className="text-green-400 font-medium">Connected</div>
          <div className="text-gray-300 font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          {balance && (
            <div className="text-gray-400 text-xs">
              {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
            </div>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  if (isPending) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed"
      >
        Check Prompt...
      </button>
    )
  }

  if (!portoConnector) {
    return null
  }

  return (
    <button
      onClick={() => connect({ connector: portoConnector })}
      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
    >
      Connect RISE Wallet
    </button>
  )
}