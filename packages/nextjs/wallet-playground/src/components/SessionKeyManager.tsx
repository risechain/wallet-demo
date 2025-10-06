'use client'

import { useState, useEffect } from 'react'
import { useSessionKeys, useSessionKeyManager } from '@/hooks/useSessionKeys'
import { formatTimeRemaining, formatPermissions, isSessionKeyUsable } from '@/utils/sessionKeyTransactions'

export function SessionKeyManager() {
  const { sessionKeys, isConnected, address } = useSessionKeys()
  const {
    createSessionKey,
    revokeSessionKey,
    getSessionKeyPrivateKey,
    isCreating,
    isRevoking
  } = useSessionKeyManager()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Clear messages after successful operations
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

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
      setSuccess('')

      await createSessionKey({
        expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      })

      setSuccess('Session key created successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to create session key')
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      setError('')
      setSuccess('')

      await revokeSessionKey(keyId)
      setSuccess('Session key revoked successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to revoke session key')
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

      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
          <p className="text-sm text-green-300">{success}</p>
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

      {/* Active Session Keys */}
      <div className="space-y-4">
        {sessionKeys.length === 0 ? (
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
            const permissions = formatPermissions(key)
            const isUsable = isSessionKeyUsable(key, getSessionKeyPrivateKey)
            const timeRemaining = formatTimeRemaining(key.expiry)
            const isExpired = key.expiry <= Math.floor(Date.now() / 1000)

            return (
              <div
                key={key.id}
                className={`p-4 border rounded-lg ${
                  isExpired
                    ? 'bg-gray-700/50 border-gray-600'
                    : isUsable
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
                        : isUsable
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
                      : isUsable
                      ? 'bg-green-600 text-green-100'
                      : 'bg-yellow-600 text-yellow-100'
                  }`}>
                    {isExpired ? 'Expired' : isUsable ? 'Active' : 'No Private Key'}
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
                    <div className="text-gray-300 font-mono text-xs break-all">
                      {key.publicKey.slice(0, 20)}...{key.publicKey.slice(-20)}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                {permissions.calls.length > 0 && (
                  <div className="mt-3">
                    <div className="text-gray-400 text-xs mb-1">Allowed Contracts:</div>
                    <div className="space-y-1">
                      {permissions.calls.map((call, idx) => (
                        <div key={idx} className="text-xs text-gray-300">
                          • {call.contract === 'Any contract' ? 'Any contract' : `${call.contract.slice(0, 8)}...${call.contract.slice(-6)}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {permissions.spend.length > 0 && (
                  <div className="mt-3">
                    <div className="text-gray-400 text-xs mb-1">Spend Limits:</div>
                    <div className="space-y-1">
                      {permissions.spend.map((spend, idx) => (
                        <div key={idx} className="text-xs text-gray-300">
                          • {parseInt(spend.limit) / 1e18} tokens per {spend.period}
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
                      disabled={isRevoking === key.id}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isRevoking === key.id ? (
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