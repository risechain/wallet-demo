'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { TOKENS, MintableERC20ABI } from '@/config/tokens'
import { useSessionKeys, useSessionKeyManager } from '@/hooks/useSessionKeys'
import { useSessionKeyPreference } from '@/context/SessionKeyContext'
import { executeTransaction, TransactionCall } from '@/utils/sessionKeyTransactions'
import { encodeFunctionData } from 'viem'

export function MintButtonSimple() {
  const { address, isConnected, connector } = useAccount()

  const { sessionKeys } = useSessionKeys()
  const sessionKeyManager = useSessionKeyManager()
  const { preferSessionKey } = useSessionKeyPreference()

  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentToken, setCurrentToken] = useState<'MockUSD' | 'MockToken' | null>(null)
  const [isSmartMinting, setIsSmartMinting] = useState(false)
  const [smartMintResult, setSmartMintResult] = useState<{
    hash: string
    success: boolean
    usedSessionKey?: boolean
    keyId?: string
  } | null>(null)

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    writeContract: mint,
    data: mintHash,
    isPending: isMinting,
    error: mintError
  } = useWriteContract()

  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash
  })

  // Check if user has already minted each token
  const { data: hasMintedMockUSD } = useReadContract({
    address: TOKENS.MockUSD.address,
    abi: MintableERC20ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
  })

  const { data: hasMintedMockToken } = useReadContract({
    address: TOKENS.MockToken.address,
    abi: MintableERC20ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
  })

  // Reset state after successful mint
  useEffect(() => {
    if (mintSuccess || smartMintResult?.success) {
      setCurrentToken(null)
      setTimeout(() => setIsOpen(false), 2000) // Close after 2 seconds
    }
  }, [mintSuccess, smartMintResult?.success])

  // Smart mint function that uses session keys when available
  const handleSmartMint = async (tokenSymbol: 'MockUSD' | 'MockToken') => {
    const token = TOKENS[tokenSymbol]
    setCurrentToken(tokenSymbol)
    setSmartMintResult(null)

    if (!connector) {
      // Fallback to regular mint
      mint({
        address: token.address,
        abi: MintableERC20ABI,
        functionName: 'mintOnce',
      })
      return
    }

    setIsSmartMinting(true)

    try {
      const mintData = encodeFunctionData({
        abi: MintableERC20ABI,
        functionName: 'mintOnce',
        args: [],
      })

      const calls: TransactionCall[] = [{
        to: token.address,
        data: mintData,
        value: '0x0'
      }]

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [token.address.toLowerCase()]
          }
        },
        connector,
        sessionKeyManager,
        sessionKeys
      )

      if (result.success) {
        setSmartMintResult(result)
      } else {
        // Fallback to regular mint on error
        mint({
          address: token.address,
          abi: MintableERC20ABI,
          functionName: 'mintOnce',
        })
      }

    } catch (err: any) {
      console.error('Smart mint error:', err)
      // Fallback to regular mint
      mint({
        address: token.address,
        abi: MintableERC20ABI,
        functionName: 'mintOnce',
      })
    } finally {
      setIsSmartMinting(false)
    }
  }

  const handleMint = (tokenSymbol: 'MockUSD' | 'MockToken') => {
    const token = TOKENS[tokenSymbol]
    setCurrentToken(tokenSymbol)

    mint({
      address: token.address,
      abi: MintableERC20ABI,
      functionName: 'mintOnce',
    })
  }

  if (!mounted || !isConnected) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        Mint Mock Tokens
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg min-w-80 z-10 p-4">
          <div className="mb-4">
            <h3 className="text-white font-medium mb-2">Mint Test Tokens</h3>
            <p className="text-gray-400 text-sm">
              Mint 1000 tokens for testing (once per address, per token)
            </p>
          </div>

          <div className="space-y-3">
            {/* MockUSD Mint Button */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="text-white font-medium">MockUSD</div>
                <div className="text-gray-400 text-sm">1000 tokens (18 decimals)</div>
              </div>
              <button
                onClick={() => handleSmartMint('MockUSD')}
                disabled={(isMinting || isSmartMinting) && currentToken === 'MockUSD' || hasMintedMockUSD}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {hasMintedMockUSD ? 'Already Minted' : (isMinting || isSmartMinting) && currentToken === 'MockUSD' ? 'Minting...' : 'Mint'}
              </button>
            </div>

            {/* MockToken Mint Button */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="text-white font-medium">MockToken</div>
                <div className="text-gray-400 text-sm">1000 tokens (18 decimals)</div>
              </div>
              <button
                onClick={() => handleSmartMint('MockToken')}
                disabled={(isMinting || isSmartMinting) && currentToken === 'MockToken' || hasMintedMockToken}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {hasMintedMockToken ? 'Already Minted' : (isMinting || isSmartMinting) && currentToken === 'MockToken' ? 'Minting...' : 'Mint'}
              </button>
            </div>
          </div>

          {/* Transaction Status */}
          {(mintHash || smartMintResult?.hash) && (
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg text-sm">
              <div className="text-blue-300">
                {smartMintResult?.usedSessionKey ? '🔑 Session key' : '🔐 Passkey'} {currentToken} mint tx:{' '}
                <a
                  href={`https://explorer.testnet.riselabs.xyz/tx/${mintHash || smartMintResult?.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {(mintHash || smartMintResult?.hash)?.slice(0, 10)}...{(mintHash || smartMintResult?.hash)?.slice(-6)} ↗
                </a>
                {(mintSuccess || smartMintResult?.success) && ' ✅'}
              </div>
              {smartMintResult?.usedSessionKey && smartMintResult?.keyId && (
                <div className="text-blue-400 text-xs mt-1">
                  Used key: {smartMintResult.keyId}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {mintError && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
              Error: {mintError.message}
            </div>
          )}

          <button
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}