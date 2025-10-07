'use client'

import { useAccount, useConnectorClient } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { parseEther, toHex } from 'viem'
import { TOKENS, UNISWAP_CONTRACTS } from '@/config/tokens'
import { Hex, Value } from 'ox'

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
  chainId?: number
}

export interface PortoAccount {
  address: string
  keys?: SessionKey[]
}

export interface PortoState {
  accounts: PortoAccount[]
  chainIds: number[]
}

// Hook to get current session keys from Porto
export function useSessionKeys() {
  const { address, isConnected, connector } = useAccount()
  const { data: connectorClient } = useConnectorClient()
  const [keys, setKeys] = useState<SessionKey[]>([])
  const [adminKeys, setAdminKeys] = useState<SessionKey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to retrieve keys from Porto using wallet_getKeys
  const retrieveKeysFromPorto = useCallback(async () => {
    if (!isConnected || !address || !connector) {
      setKeys([])
      setAdminKeys([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if connector has getProvider method, if not use connector directly as provider
      let provider;
      if (typeof connector.getProvider === 'function') {
        provider = await connector.getProvider()
      } else if (connector.request) {
        // Connector might already be the provider
        provider = connector
      } else {
        throw new Error('No provider available from connector')
      }

      const chainId = await provider.request({ method: 'eth_chainId' })

      // Get all keys associated with the account
      const keysResult = await provider.request({
        method: 'wallet_getKeys',
        params: [{
          address,
          chainIds: [chainId]
        }]
      })

      console.log('🔑 Retrieved keys from Porto:', keysResult)

      // Parse the keys response structure
      const parsedKeys: SessionKey[] = []
      const parsedAdminKeys: SessionKey[] = []

      // Handle different response formats from wallet_getKeys
      if (Array.isArray(keysResult)) {
        // Direct array format
        keysResult.forEach((key: any) => {
          const sessionKey = parsePortoKey(key, parseInt(chainId, 16))
          if (sessionKey) {
            if (sessionKey.role === 'admin') {
              parsedAdminKeys.push(sessionKey)
            } else {
              parsedKeys.push(sessionKey)
            }
          }
        })
      } else if (typeof keysResult === 'object' && keysResult) {
        // Object format with chainId keys
        Object.entries(keysResult).forEach(([chainIdKey, chainKeys]) => {
          if (Array.isArray(chainKeys)) {
            chainKeys.forEach((key: any) => {
              const sessionKey = parsePortoKey(key, parseInt(chainIdKey))
              if (sessionKey) {
                if (sessionKey.role === 'admin') {
                  parsedAdminKeys.push(sessionKey)
                } else {
                  parsedKeys.push(sessionKey)
                }
              }
            })
          }
        })
      }

      setKeys(parsedKeys)
      setAdminKeys(parsedAdminKeys)

    } catch (err: any) {
      console.error('Failed to retrieve keys from Porto:', err)
      setError(err.message || 'Failed to retrieve keys')
      setKeys([])
      setAdminKeys([])
    } finally {
      setLoading(false)
    }
  }, [isConnected, address, connector])

  // Auto-refresh keys when connection changes
  useEffect(() => {
    retrieveKeysFromPorto()
  }, [retrieveKeysFromPorto])

  // Function to manually refresh keys
  const refreshKeys = useCallback(() => {
    return retrieveKeysFromPorto()
  }, [retrieveKeysFromPorto])

  // Filter active session keys (not expired)
  const activeSessionKeys = keys.filter(
    (key) => key.role === 'session' && key.expiry > Math.floor(Date.now() / 1000)
  )

  // Get locally cached keys and merge with Porto keys
  const localKeys = getLocalSessionKeys()
  const mergedKeys = mergeKeysWithLocalCache(activeSessionKeys, localKeys)

  return {
    sessionKeys: mergedKeys,
    adminKeys,
    allKeys: [...keys, ...adminKeys],
    isConnected,
    address,
    loading,
    error,
    refreshKeys
  }
}

// Helper function to parse Porto key format to our SessionKey interface
function parsePortoKey(key: any, chainId: number): SessionKey | null {
  try {
    // Handle different Porto key formats
    const keyData = {
      id: key.id || key.hash || generateKeyId(key),
      publicKey: key.publicKey,
      type: key.type || 'p256',
      role: determineKeyRole(key),
      expiry: key.expiry || (Math.floor(Date.now() / 1000) + 3600), // Default 1 hour if not specified
      permissions: parseKeyPermissions(key.permissions || key.capabilities),
      hash: key.hash || key.id || '',
      chainId
    }

    return keyData as SessionKey
  } catch (err) {
    console.error('Failed to parse Porto key:', err, key)
    return null
  }
}

// Helper to determine if key is admin or session based on its properties
function determineKeyRole(key: any): 'admin' | 'session' {
  // Admin keys typically have no expiry or very long expiry and no specific permissions
  if (!key.expiry || !key.permissions) return 'admin'

  // Session keys have permissions and reasonable expiry
  if (key.permissions && key.expiry && key.expiry < Date.now() / 1000 + 86400 * 30) {
    return 'session'
  }

  return 'admin'
}

// Helper to parse permissions from Porto format
function parseKeyPermissions(permissions: any): SessionKey['permissions'] | undefined {
  if (!permissions) return undefined

  try {
    return {
      calls: permissions.calls?.map((call: any) => ({
        to: call.to,
        signature: call.signature
      })),
      spend: permissions.spend?.map((spend: any) => ({
        limit: spend.limit?.toString() || spend.value?.toString(),
        period: spend.period || 'hour',
        token: spend.token
      }))
    }
  } catch (err) {
    console.error('Failed to parse permissions:', err)
    return undefined
  }
}

// Generate a consistent key ID from key properties
function generateKeyId(key: any): string {
  const parts = [key.publicKey, key.type, key.expiry].filter(Boolean)
  return parts.join('-').slice(0, 16)
}

// Get locally stored session keys
function getLocalSessionKeys(): Array<{ publicKey: string; privateKey: string }> {
  // Check if we're on the client side
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return []
  }

  try {
    const keys: Array<{ publicKey: string; privateKey: string }> = []

    // Scan localStorage for session keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('porto.sessionKey.')) {
        const keyData = localStorage.getItem(key)
        if (keyData) {
          try {
            const parsed = JSON.parse(keyData)
            if (parsed.publicKey && parsed.privateKey) {
              keys.push(parsed)
            }
          } catch (e) {
            // Ignore invalid entries
          }
        }
      }
    }

    return keys
  } catch (err) {
    console.error('Failed to get local session keys:', err)
    return []
  }
}

// Merge Porto keys with local cache to include private keys
function mergeKeysWithLocalCache(
  portoKeys: SessionKey[],
  localKeys: Array<{ publicKey: string; privateKey: string }>
): SessionKey[] {
  return portoKeys.map(portoKey => {
    // Find matching local key by public key
    const localKey = localKeys.find(local =>
      local.publicKey === portoKey.publicKey
    )

    // Add a flag to indicate if we have the private key locally
    return {
      ...portoKey,
      hasPrivateKey: !!localKey
    } as SessionKey & { hasPrivateKey: boolean }
  })
}

// Hook to manage session key operations
export function useSessionKeyManager() {
  const { address, isConnected, connector } = useAccount()
  const { data: connectorClient } = useConnectorClient()
  const { refreshKeys } = useSessionKeys()
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  // Get current permissions for our contracts
  const getPermissions = async () => {
    if (!isConnected || !address || !connector) return null

    try {
      // Check if connector has getProvider method, if not use connector directly as provider
      let provider;
      if (typeof connector.getProvider === 'function') {
        provider = await connector.getProvider()
      } else if (connector.request) {
        provider = connector
      } else {
        throw new Error('No provider available from connector')
      }

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
      let provider;
      if (typeof connector.getProvider === 'function') {
        provider = await connector.getProvider()
      } else if (connector.request) {
        provider = connector
      } else {
        throw new Error('No provider available from connector')
      }
      const chainId = await provider.request({ method: 'eth_chainId' })

      console.log('🔗 Chain info:', {
        chainId,
        chainIdDecimal: parseInt(chainId, 16),
        expectedChainId: 11155931,
        isCorrectChain: parseInt(chainId, 16) === 11155931
      })

      // Default permissions for our RISE app - null feeToken to use default behavior
      const defaultPermissions = {
        expiry: options.expiry || Math.floor(Date.now() / 1000) + 3600, // 1 hour
        feeToken: null, // Use default fee token behavior like Porto playground
        permissions: options.permissions || {
          calls: [
            { to: TOKENS.MockUSD.address }, // MockUSD
            { to: TOKENS.MockToken.address }, // MockToken
            { to: UNISWAP_CONTRACTS.router }, // Uniswap Router
          ],
          spend: [
            {
              limit: Hex.fromNumber(Value.fromEther('1000')), // Allow spending up to 1000 tokens
              period: 'day',
              token: TOKENS.MockUSD.address,
            },
            {
              limit: Hex.fromNumber(Value.fromEther('1000')), // Allow spending up to 1000 tokens
              period: 'day',
              token: TOKENS.MockToken.address,
            },
          ]
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
      console.log('🔑 Session key details:', {
        publicKey: publicKey.slice(0, 20) + '...',
        permissions: requestParams.permissions,
        expiry: new Date(requestParams.expiry * 1000).toISOString()
      })

      // Refresh keys from Porto to get the new key
      setTimeout(() => {
        refreshKeys()
      }, 1000) // Small delay to allow Porto to process

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
      let provider;
      if (typeof connector.getProvider === 'function') {
        provider = await connector.getProvider()
      } else if (connector.request) {
        provider = connector
      } else {
        throw new Error('No provider available from connector')
      }

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

      // Refresh keys from Porto to reflect the revocation
      setTimeout(() => {
        refreshKeys()
      }, 1000)

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
    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }

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
  // This function now takes sessionKeys as a parameter instead of calling the hook
  const hasValidSessionKey = useCallback((
    sessionKeys: SessionKey[],
    requiredPermissions?: {
      calls?: string[]
      tokens?: string[]
    }
  ): SessionKey | null => {
    console.log('🔍 Checking session keys:', {
      totalKeys: sessionKeys.length,
      requiredPermissions,
      keysWithPrivateKey: sessionKeys.filter(k => (k as any).hasPrivateKey).length
    })

    if (sessionKeys.length === 0) return null

    // Find a key that matches our requirements
    for (const key of sessionKeys) {
      const now = Math.floor(Date.now() / 1000)
      if (key.expiry <= now) {
        console.log('⏰ Key expired:', { keyId: key.id, expiry: new Date(key.expiry * 1000) })
        continue // Expired
      }

      // Check if we have the private key (from the hasPrivateKey flag)
      const keyWithCache = key as SessionKey & { hasPrivateKey?: boolean }
      if (!keyWithCache.hasPrivateKey) {
        console.log('🔐 No private key for session key:', key.id)
        continue
      }

      // Check permissions if specified
      if (requiredPermissions) {
        const { calls = [], tokens = [] } = requiredPermissions

        // Check call permissions
        if (calls.length > 0 && key.permissions?.calls) {
          const allowedCalls = key.permissions.calls
          console.log('📞 Checking call permissions:', {
            required: calls,
            allowed: allowedCalls.map(c => c.to).filter(Boolean)
          })

          const hasCallPermission = calls.every(callTo =>
            allowedCalls.some(allowed =>
              !allowed.to || allowed.to.toLowerCase() === callTo.toLowerCase()
            )
          )
          if (!hasCallPermission) {
            console.log('❌ Call permission check failed for key:', key.id)
            continue
          }
        }

        // Check spend permissions
        if (tokens.length > 0 && key.permissions?.spend) {
          const allowedSpend = key.permissions.spend
          const hasSpendPermission = tokens.every(token =>
            allowedSpend.some(allowed =>
              !allowed.token || allowed.token.toLowerCase() === token.toLowerCase()
            )
          )
          if (!hasSpendPermission) {
            console.log('❌ Spend permission check failed for key:', key.id)
            continue
          }
        }
      }

      console.log('✅ Found valid session key:', key.id)
      return key
    }

    console.log('❌ No valid session key found')
    return null
  }, [])

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