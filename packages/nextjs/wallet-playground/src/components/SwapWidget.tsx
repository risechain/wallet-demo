'use client'

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { TOKENS, UNISWAP_CONTRACTS, MintableERC20ABI, UniswapV2RouterABI } from '@/config/tokens'
import { formatUnits, parseUnits, encodeFunctionData } from 'viem'
import { useSessionKeys } from '@/hooks/useSessionKeys'
import { useSessionKeyPreference } from '@/context/SessionKeyContext'
import {
  executeTransaction,
  extractContractAddresses,
  TransactionCall,
  RISE_CONTRACTS
} from '@/utils/sessionKeyTransactions'
import { CopyableAddress } from './CopyableAddress'

type TokenSymbol = keyof typeof TOKENS

export function SwapWidget() {
  const { address, isConnected, connector } = useAccount()

  const [mounted, setMounted] = useState(false)
  const [fromToken, setFromToken] = useState<TokenSymbol>('MockUSD')
  const [toToken, setToToken] = useState<TokenSymbol>('MockToken')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [error, setError] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [smartTxResult, setSmartTxResult] = useState<{
    hash: string
    success: boolean
    usedSessionKey?: boolean
    keyId?: string
  } | null>(null)

  // Session key hooks
  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } = useSessionKeys()
  const { preferSessionKey } = useSessionKeyPreference()

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey()
  const usableSessionKey = getUsableSessionKey()

  useEffect(() => {
    setMounted(true)
  }, [])

  const fromTokenConfig = TOKENS[fromToken]
  const toTokenConfig = TOKENS[toToken]

  // Get balances
  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address,
    token: fromTokenConfig.address,
    query: {
      refetchInterval: 10000,
    }
  })

  const { data: toBalance, refetch: refetchToBalance } = useBalance({
    address,
    token: toTokenConfig.address,
    query: {
      refetchInterval: 10000,
    }
  })

  // Check for usable session key using the updated approach
  const requiredContracts = [
    fromTokenConfig.address.toLowerCase(),
    UNISWAP_CONTRACTS.router.toLowerCase()
  ]

  // Check allowance
  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: allowanceLoading,
    error: allowanceError
  } = useReadContract({
    address: fromTokenConfig.address,
    abi: MintableERC20ABI,
    functionName: 'allowance',
    args: address ? [address, UNISWAP_CONTRACTS.router] : undefined,
    query: {
      enabled: !!address,
    }
  })

  // Parse amount for quote
  const amountInBigInt = (() => {
    try {
      if (!fromAmount || fromAmount.trim() === '') return undefined
      const numAmount = parseFloat(fromAmount)
      if (isNaN(numAmount) || numAmount <= 0) return undefined
      return parseUnits(fromAmount, fromTokenConfig.decimals)
    } catch (error) {
      console.log('❌ Amount parsing error:', error)
      return undefined
    }
  })()

  const contractArgs = amountInBigInt && fromToken !== toToken ? [
    amountInBigInt,
    [fromTokenConfig.address, toTokenConfig.address]
  ] : undefined

  // Get quote
  const {
    data: quoteData,
    isLoading: quoteLoading,
    error: quoteError,
    isError: quoteIsError,
    refetch: refetchQuote
  } = useReadContract({
    address: UNISWAP_CONTRACTS.router,
    abi: UniswapV2RouterABI,
    functionName: 'getAmountsOut',
    args: contractArgs,
    query: {
      enabled: !!contractArgs && !!amountInBigInt && fromToken !== toToken && !!address,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  })

  // Update quote amount
  useEffect(() => {
    if (quoteData && Array.isArray(quoteData) && quoteData.length >= 2) {
      try {
        const outputAmount = formatUnits(quoteData[1], toTokenConfig.decimals)
        const formattedAmount = parseFloat(outputAmount).toFixed(6)
        setToAmount(formattedAmount)
        setError('')
      } catch (formatError) {
        console.log('❌ Quote Format Error:', formatError)
        setToAmount('')
        setError('Error formatting quote')
      }
    } else if (quoteIsError || quoteError) {
      setToAmount('')
      setError(quoteError?.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT') ?
        'Insufficient liquidity' :
        'Quote failed - check liquidity')
    } else if (!fromAmount || fromAmount.trim() === '') {
      setToAmount('')
      setError('')
    }
  }, [quoteData, quoteLoading, quoteIsError, quoteError, fromAmount, toTokenConfig.decimals])

  // Check if approval needed
  const needsApproval = (() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return false
    if (allowance === undefined || allowance === null) return true

    try {
      const requiredAmount = parseUnits(fromAmount, fromTokenConfig.decimals)
      return allowance < requiredAmount
    } catch (error) {
      return true
    }
  })()





  // Smart approve function using the new executeTransaction
  const handleSmartApprove = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return

    setError('')
    setSmartTxResult(null)
    setIsExecuting(true)

    if (!connector) {
      console.error('No connector available for smart approval')
      setIsExecuting(false)
      return
    }

    try {
      const maxAmount = parseUnits('1000000000', fromTokenConfig.decimals)

      const approveCallData = encodeFunctionData({
        abi: MintableERC20ABI,
        functionName: 'approve',
        args: [UNISWAP_CONTRACTS.router, maxAmount],
      })

      const calls: TransactionCall[] = [{
        to: fromTokenConfig.address,
        data: approveCallData,
        value: '0x0'
      }]

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [fromTokenConfig.address.toLowerCase()]
          }
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      )

      if (result.success) {
        setSmartTxResult(result)
        // Refetch allowance after a delay
        setTimeout(() => {
          refetchAllowance()
          refetchFromBalance()
        }, 2000)
      } else {
        setError(`Approval failed: ${result.error}`)
      }
    } catch (err: any) {
      console.error('❌ Smart approve error:', err)
      setError(`Approval failed: ${err.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  // Smart swap function using the new executeTransaction
  const handleSmartSwap = async () => {
    if (!fromAmount || !toAmount) return

    setError('')
    setIsExecuting(true)

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError('Enter an amount')
      setIsExecuting(false)
      return
    }

    if (!toAmount || parseFloat(toAmount) <= 0) {
      setError('No quote available')
      setIsExecuting(false)
      return
    }

    if (!connector) {
      setError('No connector available')
      setIsExecuting(false)
      return
    }

    try {
      const amountIn = parseUnits(fromAmount, fromTokenConfig.decimals)
      if (fromBalance && amountIn > fromBalance.value) {
        setError('Insufficient balance')
        setIsExecuting(false)
        return
      }

      const estimatedAmountOut = parseFloat(toAmount)
      const minAmountOut = estimatedAmountOut * 0.8 // 20% slippage
      const amountOutMin = parseUnits(minAmountOut.toString(), toTokenConfig.decimals)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes

      const swapCallData = encodeFunctionData({
        abi: UniswapV2RouterABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          amountOutMin,
          [fromTokenConfig.address, toTokenConfig.address],
          address,
          deadline,
        ],
      })

      const calls: TransactionCall[] = [{
        to: UNISWAP_CONTRACTS.router,
        data: swapCallData,
        value: '0x0'
      }]

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [UNISWAP_CONTRACTS.router.toLowerCase()]
          }
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      )

      if (result.success) {
        setSmartTxResult(result)
        setFromAmount('')
        setToAmount('')
        setError('')
        // Refetch balances after a delay
        setTimeout(() => {
          refetchFromBalance()
          refetchToBalance()
        }, 2000)
      } else {
        setError(`Swap failed: ${result.error}`)
      }
    } catch (err: any) {
      console.error('❌ Smart swap error:', err)
      setError(`Swap failed: ${err.message}`)
    } finally {
      setIsExecuting(false)
    }
  }


  const handleTokenSwitch = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount('')
    setToAmount('')
    setError('')
    setSmartTxResult(null)
  }

  const handleMaxClick = () => {
    if (fromBalance) {
      const maxAmount = formatUnits(fromBalance.value, fromBalance.decimals)
      setFromAmount(maxAmount)
    }
  }

  if (!mounted) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-700 rounded w-1/3 mx-auto"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="p-8 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-gray-300 font-medium">Connect your wallet to swap</p>
      </div>
    )
  }

  const isTransacting = false // No longer using wagmi transactions
  const canSwap = Boolean(
    fromAmount &&
    toAmount &&
    !needsApproval &&
    !isTransacting &&
    !quoteLoading &&
    !allowanceLoading &&
    parseFloat(fromAmount) > 0 &&
    parseFloat(toAmount) > 0 &&
    !error &&
    address &&
    allowance !== undefined
  )

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Swap</h3>
        {/* Session Key Status */}
        <div className="text-xs text-gray-400">
          {preferSessionKey && usableSessionKey ? (
            <span className="text-green-400">🔑 Session key ready</span>
          ) : preferSessionKey ? (
            <span className="text-yellow-400">🔐 Will use passkey</span>
          ) : (
            <span className="text-gray-400">🔐 Passkey mode</span>
          )}
        </div>
      </div>

      {/* Transaction Success Popup */}
      {smartTxResult?.hash && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-green-300">
              {smartTxResult?.usedSessionKey ? '🔑 Session key' : '🔐 Passkey'} transaction successful!
            </span>
            <div className="flex items-center gap-1">
              <CopyableAddress
                address={smartTxResult?.hash || ''}
                prefix={8}
                suffix={6}
                className="text-green-400"
              />
              <a
                href={`https://explorer.testnet.riselabs.xyz/tx/${smartTxResult?.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
                title="View on explorer"
              >
                ↗
              </a>
            </div>
          </div>
          {smartTxResult?.success && (
            <div className="flex items-center mt-1">
              <svg className="w-4 h-4 text-green-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-400">Transaction confirmed ✅</span>
            </div>
          )}
          {smartTxResult?.usedSessionKey && smartTxResult?.keyId && (
            <div className="text-green-400 text-xs mt-1 flex items-center">
              Used key:
              <CopyableAddress
                address={smartTxResult.keyId}
                prefix={6}
                suffix={6}
                className="text-green-400 ml-1"
              />
            </div>
          )}
        </div>
      )}

      {/* From Section */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">From</span>
          <span className="text-sm text-gray-400">
            Balance: {fromBalance ? parseFloat(formatUnits(fromBalance.value, fromBalance.decimals)).toFixed(4) : '0'}
          </span>
        </div>

        <div className="relative bg-gray-700 border border-gray-600 rounded-xl p-4 hover:border-gray-500 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <input
                type="text"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => {
                  setFromAmount(e.target.value)
                  setError('')
                  setSmartTxResult(null)
                }}
                className="w-full text-2xl font-semibold bg-transparent text-white placeholder-gray-400 border-none outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleMaxClick}
                className="px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                MAX
              </button>

              <div className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-sm font-medium text-white">
                {fromTokenConfig.symbol}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center my-4">
        <button
          onClick={handleTokenSwitch}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full border border-gray-600 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">To</span>
          <span className="text-sm text-gray-400">
            Balance: {toBalance ? parseFloat(formatUnits(toBalance.value, toBalance.decimals)).toFixed(4) : '0'}
          </span>
        </div>

        <div className="relative bg-gray-700 border border-gray-600 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <div className="text-2xl font-semibold text-white">
                {quoteLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                    <span className="text-gray-400">Loading...</span>
                  </div>
                ) : (
                  <span>{toAmount || <span className="text-gray-400">0</span>}</span>
                )}
              </div>
            </div>

            <div className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-sm font-medium text-white">
              {toTokenConfig.symbol}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}


      {/* Action Button */}
      <div className="space-y-3">
        {needsApproval && !smartTxResult?.success ? (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-sm text-yellow-300">
                You need to approve {fromTokenConfig.symbol} spending first
              </p>
            </div>
            <button
              onClick={handleSmartApprove}
              disabled={isExecuting || !fromAmount || parseFloat(fromAmount) <= 0}
              className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
            >
              {isExecuting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Approving...
                </div>
              ) : (
                `${preferSessionKey && usableSessionKey ? '🔑' : '🔐'} Approve ${fromTokenConfig.symbol}`
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSmartSwap}
            disabled={isExecuting || !canSwap}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
          >
            {isExecuting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Swapping...
              </div>
            ) : (
              `${preferSessionKey && usableSessionKey ? '🔑' : '🔐'} Swap`
            )}
          </button>
        )}
      </div>

    </div>
  )
}