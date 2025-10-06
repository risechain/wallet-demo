'use client'

import { useAccount, useConnectorClient } from 'wagmi'
import { useState, useSyncExternalStore } from 'react'
import { parseEther, toHex } from 'viem'

export interface SessionKey {
  id: string
  publicKey: string
  type: 'p256' | 'secp256k1' | 'webauthn-p256'
  role: 'admin' | 'session'
  expiry: number
  permissions?: {
    calls?: Array<{
      to?: string
      signature?: string
    }>
    spend?: Array<{
      limit: string
      period: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
      token?: string
    }>
  }
  hash: string
}

export interface PortoState {
  accounts: Array<{
    address: string
    keys?: SessionKey[]
  }>
  chainIds: number[]
}

// Cache the empty state to avoid infinite re-renders
const EMPTY_PORTO_STATE: PortoState = { accounts: [], chainIds: [] }

// Hook to get current session keys from porto store
export function useSessionKeys() {
  const { address, isConnected } = useAccount()

  // Subscribe to porto's internal store
  const portoState = useSyncExternalStore(
    (callback) => {
      // For now, return empty function until we can access porto internal store
      return () => {}
    },
    () => {
      // Return cached empty state to avoid infinite re-renders
      return EMPTY_PORTO_STATE
    },
    () => EMPTY_PORTO_STATE // SSR fallback - use same cached object
  )

  const currentAccount = portoState.accounts.find(
    (account) => account.address === address
  )

  const sessionKeys = currentAccount?.keys?.filter(
    (key) => key.role === 'session' && key.expiry > Math.floor(Date.now() / 1000)
  ) || []

  const adminKeys = currentAccount?.keys?.filter(
    (key) => key.role === 'admin'
  ) || []

  return {
    sessionKeys,
    adminKeys,
    allKeys: currentAccount?.keys || [],
    isConnected,
    address
  }
}

// Hook to manage session key operations
export function useSessionKeyManager() {
  const { address, isConnected, connector } = useAccount()
  const { data: connectorClient } = useConnectorClient()
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  // Get current permissions for our contracts
  const getPermissions = async () => {
    if (!isConnected || !address || !connector) return null

    try {
      const provider = await connector.getProvider()
      const permissions = await provider.request({
        method: 'wallet_getPermissions',
        params: [{ address }]
      })
      return permissions
    } catch (error) {
      console.error('Failed to get permissions:', error)
      return null
    }
  }

  // Create a new session key with our app permissions
  const createSessionKey = async (options: {
    expiry?: number
    permissions?: SessionKey['permissions']
  } = {}) => {
    if (!isConnected || !address || !connector) {
      throw new Error('Wallet not connected')
    }

    setIsCreating(true)
    try {
      // Import P256 from porto package
      const { P256, PublicKey } = await import('ox')

      // Generate a new P256 key pair
      const privateKey = P256.randomPrivateKey()
      const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
        includePrefix: false,
      })

      // Store the key pair in localStorage for this session
      // In production, you'd want more secure storage
      const keyPair = { privateKey, publicKey }
      localStorage.setItem(`porto.sessionKey.${publicKey}`, JSON.stringify(keyPair))

      // Get current chain ID
      const provider = await connector.getProvider()
      const chainId = await provider.request({ method: 'eth_chainId' })

      console.log('🔗 Chain info:', {
        chainId,
        chainIdDecimal: parseInt(chainId, 16),
        expectedChainId: 11155931,
        isCorrectChain: parseInt(chainId, 16) === 11155931
      })

      // Default permissions for our RISE app
      const defaultPermissions = {
        expiry: options.expiry || Math.floor(Date.now() / 1000) + 3600, // 1 hour
        feeToken: {
          limit: '1', // Fee limit amount as string
        }, // Try minimal object format
        permissions: options.permissions || {
          calls: [
            { to: '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50' }, // MockUSD - minimal test
          ]
          // Removed spend permissions for minimal test
        }
      }

      // Grant permissions with the new key
      const requestParams = {
        key: { publicKey, type: 'p256' },
        ...defaultPermissions,
      }

      console.log('🔑 wallet_grantPermissions request:', JSON.stringify(requestParams, null, 2))

      const result = await provider.request({
        method: 'wallet_grantPermissions',
        params: [requestParams],
      })

      console.log('✅ Session key created:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to create session key:', error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  // Revoke a session key
  const revokeSessionKey = async (keyId: string) => {
    if (!isConnected || !address || !connector) {
      throw new Error('Wallet not connected')
    }

    setIsRevoking(keyId)
    try {
      const provider = await connector.getProvider()
      const result = await provider.request({
        method: 'wallet_revokePermissions',
        params: [{ id: keyId }]
      })

      // Also remove from localStorage
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('porto.sessionKey.')
      )

      for (const key of keys) {
        const keyData = localStorage.getItem(key)
        if (keyData) {
          try {
            const parsed = JSON.parse(keyData)
            if (parsed.publicKey && keyId.includes(parsed.publicKey)) {
              localStorage.removeItem(key)
              break
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      console.log('✅ Session key revoked:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to revoke session key:', error)
      throw error
    } finally {
      setIsRevoking(null)
    }
  }

  // Get stored session key private key
  const getSessionKeyPrivateKey = (publicKey: string): string | null => {
    try {
      const keyData = localStorage.getItem(`porto.sessionKey.${publicKey}`)
      if (keyData) {
        const parsed = JSON.parse(keyData)
        return parsed.privateKey
      }
    } catch (error) {
      console.error('Failed to get session key private key:', error)
    }
    return null
  }

  // Check if we have a valid session key for current operations
  const hasValidSessionKey = (requiredPermissions?: {
    calls?: string[]
    tokens?: string[]
  }): SessionKey | null => {
    const { sessionKeys } = useSessionKeys()

    if (sessionKeys.length === 0) return null

    // Find a key that matches our requirements
    for (const key of sessionKeys) {
      const now = Math.floor(Date.now() / 1000)
      if (key.expiry <= now) continue // Expired

      // Check if we have the private key
      const privateKey = getSessionKeyPrivateKey(key.publicKey)
      if (!privateKey) continue

      // Check permissions if specified
      if (requiredPermissions) {
        const { calls = [], tokens = [] } = requiredPermissions

        // Check call permissions
        if (calls.length > 0 && key.permissions?.calls) {
          const allowedCalls = key.permissions.calls
          const hasCallPermission = calls.every(callTo =>
            allowedCalls.some(allowed =>
              !allowed.to || allowed.to.toLowerCase() === callTo.toLowerCase()
            )
          )
          if (!hasCallPermission) continue
        }

        // Check spend permissions
        if (tokens.length > 0 && key.permissions?.spend) {
          const allowedSpend = key.permissions.spend
          const hasSpendPermission = tokens.every(token =>
            allowedSpend.some(allowed =>
              !allowed.token || allowed.token.toLowerCase() === token.toLowerCase()
            )
          )
          if (!hasSpendPermission) continue
        }
      }

      return key
    }

    return null
  }

  return {
    createSessionKey,
    revokeSessionKey,
    getPermissions,
    getSessionKeyPrivateKey,
    hasValidSessionKey,
    isCreating,
    isRevoking
  }
}