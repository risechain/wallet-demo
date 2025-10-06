'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from 'wagmi'
import { parseUnits, parseEther, isAddress, formatUnits } from 'viem'
import { TOKENS, MintableERC20ABI } from '@/config/tokens'

type TokenSymbol = keyof typeof TOKENS

export function TransferWidgetSimple() {
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenSymbol | 'ETH'>('ETH')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

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

  // For token transfers
  const {
    writeContract: transferToken,
    data: transferTokenHash,
    isPending: isTransferringToken,
    error: transferTokenError
  } = useWriteContract()

  const { isSuccess: transferTokenSuccess } = useWaitForTransactionReceipt({
    hash: transferTokenHash
  })

  // For ETH transfers
  const {
    sendTransaction: sendETH,
    data: sendETHHash,
    isPending: isSendingETH,
    error: sendETHError
  } = useSendTransaction()

  const { isSuccess: sendETHSuccess } = useWaitForTransactionReceipt({
    hash: sendETHHash
  })

  // Reset form after successful transfer
  useEffect(() => {
    if (transferTokenSuccess || sendETHSuccess) {
      setRecipient('')
      setAmount('')
      setError('')
    }
  }, [transferTokenSuccess, sendETHSuccess])

  const handleTransfer = () => {
    setError('')

    if (!isAddress(recipient)) {
      setError('Invalid recipient address')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount')
      return
    }

    try {
      if (isETH) {
        const value = parseEther(amount)
        if (balance && value > balance.value) {
          setError('Insufficient balance')
          return
        }
        sendETH({
          to: recipient as `0x${string}`,
          value: value,
        })
      } else if (token) {
        const parsedAmount = parseUnits(amount, token.decimals)
        if (balance && parsedAmount > balance.value) {
          setError('Insufficient balance')
          return
        }
        transferToken({
          address: token.address,
          abi: MintableERC20ABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, parsedAmount],
        })
      }
    } catch (err) {
      setError('Invalid amount format')
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

  const isTransferring = isTransferringToken || isSendingETH
  const transferHash = transferTokenHash || sendETHHash
  const transferSuccess = transferTokenSuccess || sendETHSuccess
  const transferError = transferTokenError || sendETHError

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
      <h3 className="text-xl font-semibold mb-6 text-white">Transfer Tokens</h3>

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

        {transferError && (
          <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
            Transfer failed: {transferError.message}
          </div>
        )}
      </div>

      {/* Transfer Button */}
      <button
        onClick={handleTransfer}
        disabled={isTransferring || !recipient || !amount || parseFloat(amount) <= 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {isTransferring ? 'Sending...' : `Send ${selectedToken}`}
      </button>

      {/* Transaction Status */}
      {transferHash && (
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg text-sm">
          <div className="text-blue-300">
            Transfer tx:{' '}
            <a
              href={`https://explorer.testnet.riselabs.xyz/tx/${transferHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {transferHash.slice(0, 10)}...{transferHash.slice(-6)} ↗
            </a>
            {transferSuccess && ' ✅'}
          </div>
        </div>
      )}
    </div>
  )
}