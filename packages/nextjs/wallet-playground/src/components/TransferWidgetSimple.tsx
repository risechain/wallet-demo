'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { parseUnits, parseEther, isAddress, formatUnits, encodeFunctionData } from 'viem'
import { TOKENS, MintableERC20ABI } from '@/config/tokens'
import { useSessionKeys } from '@/hooks/useSessionKeys'
import { useSessionKeyPreference } from '@/context/SessionKeyContext'
import { executeTransaction, extractContractAddresses, TransactionCall } from '@/utils/sessionKeyTransactions'
import { CopyableAddress } from './CopyableAddress'

type TokenSymbol = keyof typeof TOKENS

export function TransferWidgetSimple() {
  const { address, isConnected, connector } = useAccount()

  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } = useSessionKeys()
  const { preferSessionKey } = useSessionKeyPreference()

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey()
  const usableSessionKey = getUsableSessionKey()

  const [mounted, setMounted] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenSymbol | 'ETH'>('MockUSD')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [isSmartTransferring, setIsSmartTransferring] = useState(false)
  const [smartTransferResult, setSmartTransferResult] = useState<{
    hash?: string
    success: boolean
    usedSessionKey?: boolean
    keyId?: string
    error?: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isETH = selectedToken === 'ETH'
  const token = isETH ? null : TOKENS[selectedToken as TokenSymbol]

  // Get balance
  const { data: balance } = useBalance({
    address,
    token: token?.address,
  })


  // Reset form after successful transfer
  useEffect(() => {
    if (smartTransferResult?.success) {
      setRecipient('')
      setAmount('')
      setError('')
    }
  }, [smartTransferResult?.success])

  // Smart transfer function that uses session keys when available
  const handleSmartTransfer = async () => {
    setError('')
    setSmartTransferResult(null)

    if (!isAddress(recipient)) {
      setError('Invalid recipient address')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount')
      return
    }

    if (!connector) {
      setError('Wallet connector not available')
      return
    }

    setIsSmartTransferring(true)

    try {
      let calls: TransactionCall[] = []

      if (isETH) {
        const value = parseEther(amount)
        if (balance && value > balance.value) {
          setError('Insufficient balance')
          setIsSmartTransferring(false)
          return
        }

        calls = [{
          to: recipient,
          value: value.toString(),
          data: '0x'
        }]
      } else if (token) {
        const parsedAmount = parseUnits(amount, token.decimals)
        if (balance && parsedAmount > balance.value) {
          setError('Insufficient balance')
          setIsSmartTransferring(false)
          return
        }

        const transferData = encodeFunctionData({
          abi: MintableERC20ABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, parsedAmount],
        })

        calls = [{
          to: token.address,
          data: transferData,
          value: '0x0'
        }]
      }

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: extractContractAddresses(calls)
          }
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      )

      if (result.success) {
        setSmartTransferResult(result)
      } else {
        setError(result.error || 'Transfer failed')
      }

    } catch (err: any) {
      console.error('Smart transfer error:', err)
      setError(err.message || 'Transfer failed')
    } finally {
      setIsSmartTransferring(false)
    }
  }


  if (!mounted) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <p className="text-gray-400">Please connect your wallet to use transfers</p>
      </div>
    )
  }

  const isTransferring = isSmartTransferring
  const transferHash = smartTransferResult?.hash
  const transferSuccess = smartTransferResult?.success

  // Check if we have an active session key (like playground)
  const optimalKey = keyExists

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Transfer Tokens</h3>
        <div className="text-xs text-gray-400">
          {preferSessionKey && optimalKey ? (
            <span className="text-green-400">🔑 Session key ready</span>
          ) : preferSessionKey ? (
            <span className="text-yellow-400">🔐 Will use passkey</span>
          ) : (
            <span className="text-gray-400">🔐 Passkey mode</span>
          )}
        </div>
      </div>

      {/* Transaction Success Popup */}
      {transferHash && transferSuccess && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-green-300">
              {smartTransferResult?.usedSessionKey ? '🔑 Session key' : '🔐 Passkey'} transfer successful!
            </span>
            <div className="flex items-center gap-1">
              <CopyableAddress
                address={transferHash || ''}
                prefix={8}
                suffix={6}
                className="text-green-400"
              />
              <a
                href={`https://explorer.testnet.riselabs.xyz/tx/${transferHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
                title="View on explorer"
              >
                ↗
              </a>
            </div>
          </div>
          <div className="flex items-center mt-1">
            <svg className="w-4 h-4 text-green-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-400">Transfer confirmed ✅</span>
          </div>
          {smartTransferResult?.usedSessionKey && smartTransferResult?.keyId && (
            <div className="text-green-400 text-xs mt-1 flex items-center">
              Used key:
              <CopyableAddress
                address={smartTransferResult.keyId}
                prefix={6}
                suffix={6}
                className="text-green-400 ml-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Token Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Token
        </label>
        <select
          value={selectedToken}
          onChange={(e) => {
            setSelectedToken(e.target.value as TokenSymbol | 'ETH')
            setError('')
          }}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ETH">ETH - Ether</option>
          {Object.entries(TOKENS).map(([symbol, tokenInfo]) => (
            <option key={symbol} value={symbol}>
              {symbol} - {tokenInfo.name}
            </option>
          ))}
        </select>
      </div>

      {/* Balance Display */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="text-sm text-gray-400 mb-1">Balance</div>
        <div className="text-2xl font-bold text-white">
          {balance ?
            `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${selectedToken}` :
            `0 ${selectedToken}`
          }
        </div>
      </div>

      {/* Transfer Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value)
              setError('')
            }}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount
          </label>
          <input
            type="text"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
            }}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {smartTransferResult?.error && (
          <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
            Transfer failed: {smartTransferResult.error}
          </div>
        )}
      </div>

      {/* Transfer Button */}
      <button
        onClick={handleSmartTransfer}
        disabled={isTransferring || !recipient || !amount || parseFloat(amount) <= 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {isTransferring ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Sending...
          </div>
        ) : (
          <>
            {preferSessionKey && optimalKey ? '🔑' : '🔐'} Send {selectedToken}
          </>
        )}
      </button>

    </div>
  )
}