'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useSessionKeys } from '@/hooks/useSessionKeys'
import { CopyableAddress } from './CopyableAddress'

// Helper function to format time remaining
function formatTimeRemaining(expiry: number): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = expiry - now

  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

export function SessionKeyManager() {
  const { isConnected } = useAccount()
  const { sessionKeys, createSessionKey, hasSessionKey, revokeSessionKey, fetchSessionKeys, isCreating, loading } = useSessionKeys()

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null)

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Clear messages after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!mounted) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-700 rounded w-1/3 mx-auto"></div>
        </div>
      </div>
    )
  }

  const handleCreateKey = async () => {
    try {
      setError('')
      const result = await createSessionKey()
      setResult(result)
    } catch (err: any) {
      // Handle user rejection gracefully
      if (err.message?.includes('user rejected') || err.message?.includes('User rejected')) {
        setError('Session key creation was cancelled')
      } else {
        setError(err.message || 'Failed to create session key')
      }
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      setError('')
      setRevokingKeyId(keyId)

      await revokeSessionKey(keyId)
      setResult(null)
    } catch (err: any) {
      // Handle user rejection gracefully
      if (err.message?.includes('user rejected') || err.message?.includes('User rejected')) {
        setError('Session key revocation was cancelled')
      } else {
        setError(err.message || 'Failed to revoke session key')
      }
    } finally {
      setRevokingKeyId(null)
    }
  }


  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2m0 0V3" />
          </svg>
        </div>
        <p className="text-gray-300 font-medium">Connect your wallet to manage session keys</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
      <h3 className="text-lg font-semibold mb-6 text-white">Session Key Management</h3>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
          <p className="text-sm text-green-300">Session key created successfully!</p>
        </div>
      )}

      {/* Create Session Key Button */}
      <div className="mb-6">
        <button
          onClick={handleCreateKey}
          disabled={isCreating}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Creating Session Key...
            </div>
          ) : (
            '🔑 Create New Session Key'
          )}
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Session keys enable faster transactions without biometric confirmation
        </p>
      </div>

      {/* Session Keys List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading session keys...</p>
          </div>
        ) : sessionKeys.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2m0 0V3" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No active session keys</p>
            <p className="text-gray-500 text-xs mt-1">Create one to enable faster transactions</p>
          </div>
        ) : (
          sessionKeys.map((key) => {
            const isExpired = key.expiry <= Math.floor(Date.now() / 1000)
            const timeRemaining = formatTimeRemaining(key.expiry)

            return (
              <div
                key={key.id}
                className={`p-4 border rounded-lg ${
                  isExpired
                    ? 'bg-gray-700/50 border-gray-600'
                    : key.hasPrivateKey
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-yellow-900/20 border-yellow-600'
                }`}
              >
                {/* Key Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isExpired
                        ? 'bg-gray-500'
                        : key.hasPrivateKey
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-white font-medium">
                      {key.type === 'p256' ? '🔑' : key.type === 'webauthn-p256' ? '👆' : '🔐'} Session Key
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isExpired
                      ? 'bg-gray-600 text-gray-300'
                      : key.hasPrivateKey
                      ? 'bg-green-600 text-green-100'
                      : 'bg-yellow-600 text-yellow-100'
                  }`}>
                    {isExpired ? 'Expired' : key.hasPrivateKey ? 'Active (Local)' : 'Active (Remote)'}
                  </span>
                </div>

                {/* Key Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expires:</span>
                    <span className={isExpired ? 'text-red-400' : 'text-gray-300'}>
                      {timeRemaining}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-gray-300">{key.type}</span>
                  </div>

                  <div>
                    <span className="text-gray-400">Public Key:</span>
                    <div className="text-gray-300 text-xs mt-1">
                      <CopyableAddress
                        address={key.publicKey}
                        prefix={10}
                        suffix={10}
                        className="text-gray-300"
                      />
                    </div>
                  </div>

                  {!key.hasPrivateKey && (
                    <div className="text-yellow-400 text-xs">
                      ⚠️ Private key not available locally - cannot use for transactions
                    </div>
                  )}
                </div>

                {/* Permissions */}
                {key.permissions?.calls && key.permissions.calls.length > 0 && (
                  <div className="mt-3">
                    <div className="text-gray-400 text-xs mb-1">Allowed Contracts:</div>
                    <div className="space-y-1">
                      {key.permissions.calls.map((call, idx) => (
                        <div key={idx} className="text-xs text-gray-300 flex items-center">
                          • {call.to ? (
                            <CopyableAddress
                              address={call.to}
                              prefix={6}
                              suffix={4}
                              className="text-gray-300 ml-1"
                            />
                          ) : (
                            'Any contract'
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {key.permissions?.spend && key.permissions.spend.length > 0 && (
                  <div className="mt-3">
                    <div className="text-gray-400 text-xs mb-1">Spend Limits:</div>
                    <div className="space-y-1">
                      {key.permissions.spend.map((spend, idx) => (
                        <div key={idx} className="text-xs text-gray-300">
                          • {spend.limit ? `${parseInt(spend.limit) / 1e18} tokens` : 'No limit'} per {spend.period || 'hour'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isExpired && (
                  <div className="mt-4 pt-3 border-t border-gray-600">
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      disabled={revokingKeyId === key.id}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {revokingKeyId === key.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Revoking...
                        </div>
                      ) : (
                        'Revoke Key'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Refresh Button */}
        <div className="flex justify-center">
          <button
            onClick={fetchSessionKeys}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Keys'}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">About Session Keys:</p>
            <ul className="space-y-1">
              <li>• Enable transactions without biometric confirmation</li>
              <li>• Limited permissions for security</li>
              <li>• Automatically expire after set time</li>
              <li>• Can be revoked at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}