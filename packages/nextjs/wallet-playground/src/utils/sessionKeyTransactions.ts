'use client'

import type { SessionKey } from '@/hooks/useSessionKeys'
import { Hex } from 'ox'

export interface TransactionCall {
  to: string
  data?: string
  value?: string
}

export interface SessionKeyTransactionResult {
  hash: string
  success: boolean
  error?: string
  usedSessionKey?: boolean
  keyId?: string
}

export interface TransactionOptions {
  preferSessionKey?: boolean
  requiredPermissions?: {
    calls?: string[]
    tokens?: string[]
  }
}

/**
 * Execute a transaction using a session key
 * Note: This function needs a connector instance to work properly
 */
export async function executeWithSessionKey(
  sessionKey: SessionKey,
  privateKey: string,
  calls: TransactionCall[],
  connector?: any // We'll pass the connector from the component
): Promise<SessionKeyTransactionResult> {
  try {
    console.log('🔑 Executing transaction with session key:', {
      keyId: sessionKey.id,
      calls: calls.length,
      expiry: sessionKey.expiry,
      now: Math.floor(Date.now() / 1000)
    })

    // Verify key hasn't expired
    if (sessionKey.expiry <= Math.floor(Date.now() / 1000)) {
      throw new Error('Session key has expired')
    }

    if (!connector) {
      throw new Error('Connector not available')
    }

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

    // Step 1: Prepare the calls with the session key
    const { digest, ...request } = await provider.request({
      method: 'wallet_prepareCalls',
      params: [
        {
          calls,
          chainId: Hex.fromNumber(parseInt(chainId, 16)),
          key: {
            publicKey: sessionKey.publicKey,
            type: sessionKey.type,
          },
        },
      ],
    })

    console.log('📝 Prepared calls:', {
      digest,
      requestKeys: Object.keys(request),
      chainId
    })

    // Step 2: Sign the digest with the session key's private key
    const { P256, Signature } = await import('ox')

    const signature = Signature.toHex(
      P256.sign({
        payload: digest,
        privateKey,
      })
    )

    console.log('✍️ Signed with session key:', {
      digest: digest.slice(0, 10) + '...',
      signature: signature.slice(0, 10) + '...'
    })

    // Step 3: Send the prepared calls with signature
    const results = await provider.request({
      method: 'wallet_sendPreparedCalls',
      params: [
        {
          ...request,
          signature,
        },
      ],
    })

    const hash = results[0]?.id
    if (!hash) {
      throw new Error('No transaction hash returned')
    }

    console.log('🚀 Transaction sent:', hash)

    return {
      hash,
      success: true
    }
  } catch (error: any) {
    console.error('❌ Session key transaction failed:', error)
    return {
      hash: '',
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Check if a session key can execute specific calls
 */
export function canExecuteCalls(
  sessionKey: SessionKey,
  calls: TransactionCall[]
): { canExecute: boolean; reason?: string } {
  // Check expiry
  if (sessionKey.expiry <= Math.floor(Date.now() / 1000)) {
    return { canExecute: false, reason: 'Session key has expired' }
  }

  // Check call permissions
  if (sessionKey.permissions?.calls) {
    const allowedCalls = sessionKey.permissions.calls

    for (const call of calls) {
      const hasPermission = allowedCalls.some(allowed => {
        // If no 'to' restriction, all contracts are allowed
        if (!allowed.to) return true

        // Check contract address match
        if (allowed.to.toLowerCase() !== call.to.toLowerCase()) return false

        // If no signature restriction, all functions are allowed
        if (!allowed.signature) return true

        // TODO: Check function signature match in call.data
        // For now, assume signature checking is handled by the smart contract
        return true
      })

      if (!hasPermission) {
        return {
          canExecute: false,
          reason: `No permission for contract ${call.to}`
        }
      }
    }
  }

  return { canExecute: true }
}

/**
 * Get spend limit info for a token
 */
export function getSpendLimit(
  sessionKey: SessionKey,
  tokenAddress?: string
): { limit: string; period: string } | null {
  if (!sessionKey.permissions?.spend) return null

  const spendPermission = sessionKey.permissions.spend.find(s => {
    if (!tokenAddress) return !s.token // Native token
    return s.token?.toLowerCase() === tokenAddress.toLowerCase()
  })

  if (!spendPermission) return null

  return {
    limit: spendPermission.limit,
    period: spendPermission.period
  }
}

/**
 * Format session key permissions for display
 */
export function formatPermissions(sessionKey: SessionKey) {
  const permissions = sessionKey.permissions

  if (!permissions) {
    return { calls: [], spend: [] }
  }

  const calls = permissions.calls?.map(call => ({
    contract: call.to || 'Any contract',
    function: call.signature || 'Any function'
  })) || []

  const spend = permissions.spend?.map(spend => ({
    token: spend.token || 'Native token',
    limit: spend.limit,
    period: spend.period
  })) || []

  return { calls, spend }
}

/**
 * Check if session key is valid and has private key
 */
export function isSessionKeyUsable(
  sessionKey: SessionKey,
  getPrivateKey: (publicKey: string) => string | null
): boolean {
  // Check expiry
  if (sessionKey.expiry <= Math.floor(Date.now() / 1000)) {
    return false
  }

  // Check if we have the private key
  const privateKey = getPrivateKey(sessionKey.publicKey)
  if (!privateKey) {
    return false
  }

  return true
}

/**
 * Format time remaining until expiry
 */
export function formatTimeRemaining(expiry: number): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = expiry - now

  if (remaining <= 0) return 'Expired'

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Smart transaction execution that automatically chooses between session keys and passkeys
 */
export async function executeTransaction(
  calls: TransactionCall[],
  options: TransactionOptions = {},
  connector?: any,
  sessionKeyManager?: any,
  sessionKeys?: SessionKey[]
): Promise<SessionKeyTransactionResult> {
  try {
    console.log('🚀 Starting smart transaction execution:', {
      calls: calls.length,
      preferSessionKey: options.preferSessionKey,
      requiredPermissions: options.requiredPermissions
    })

    if (!connector) {
      throw new Error('Connector not available')
    }

    // Try to find a suitable session key if preferred or if permissions are specified
    if (options.preferSessionKey !== false && sessionKeyManager && sessionKeys) {
      const suitableKey = sessionKeyManager.hasValidSessionKey(sessionKeys, options.requiredPermissions)

      if (suitableKey) {
        console.log('🔑 Found suitable session key, attempting session key transaction')

        const privateKey = sessionKeyManager.getSessionKeyPrivateKey(suitableKey.publicKey)
        if (privateKey) {
          try {
            const result = await executeWithSessionKey(suitableKey, privateKey, calls, connector)
            if (result.success) {
              return {
                ...result,
                usedSessionKey: true,
                keyId: suitableKey.id
              }
            }
          } catch (sessionKeyError) {
            console.warn('Session key transaction failed, falling back to passkey:', sessionKeyError)
          }
        }
      }
    }

    // Fallback to regular passkey transaction
    console.log('🔐 Using passkey transaction')
    const result = await executeWithPasskey(calls, connector)
    return {
      ...result,
      usedSessionKey: false
    }

  } catch (error: any) {
    console.error('❌ Smart transaction execution failed:', error)
    return {
      hash: '',
      success: false,
      error: error.message || 'Unknown error',
      usedSessionKey: false
    }
  }
}

/**
 * Execute transaction using passkey (regular wallet flow)
 */
export async function executeWithPasskey(
  calls: TransactionCall[],
  connector: any
): Promise<SessionKeyTransactionResult> {
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

    // For regular transactions, we can use eth_sendTransaction or wallet_sendCalls
    // depending on what's available. Let's try wallet_sendCalls first as it's more suitable for multiple calls

    const results = await provider.request({
      method: 'wallet_sendCalls',
      params: [{
        calls: calls.map(call => ({
          to: call.to,
          data: call.data || '0x',
          value: call.value || '0x0'
        }))
      }]
    })

    const hash = results[0]?.id || results.hash
    if (!hash) {
      throw new Error('No transaction hash returned')
    }

    console.log('🚀 Passkey transaction sent:', hash)

    return {
      hash,
      success: true,
      usedSessionKey: false
    }
  } catch (error: any) {
    console.error('❌ Passkey transaction failed:', error)
    return {
      hash: '',
      success: false,
      error: error.message || 'Passkey transaction failed',
      usedSessionKey: false
    }
  }
}

/**
 * Find the best session key for given transaction requirements
 */
export function findOptimalSessionKey(
  sessionKeys: SessionKey[],
  requirements?: {
    calls?: string[]
    tokens?: string[]
  },
  getPrivateKey?: (publicKey: string) => string | null
): SessionKey | null {
  if (sessionKeys.length === 0) return null

  const now = Math.floor(Date.now() / 1000)
  const validKeys = sessionKeys.filter(key => {
    // Must not be expired
    if (key.expiry <= now) return false

    // Must have private key available
    if (getPrivateKey && !getPrivateKey(key.publicKey)) return false

    return true
  })

  if (validKeys.length === 0) return null

  // If no specific requirements, return the key with the longest expiry
  if (!requirements) {
    return validKeys.reduce((best, current) =>
      current.expiry > best.expiry ? current : best
    )
  }

  // Find keys that satisfy the requirements
  const suitableKeys = validKeys.filter(key => {
    const { calls = [], tokens = [] } = requirements

    // Check call permissions
    if (calls.length > 0 && key.permissions?.calls) {
      const allowedCalls = key.permissions.calls
      const hasCallPermission = calls.every(callTo =>
        allowedCalls.some(allowed =>
          !allowed.to || allowed.to.toLowerCase() === callTo.toLowerCase()
        )
      )
      if (!hasCallPermission) return false
    }

    // Check spend permissions
    if (tokens.length > 0 && key.permissions?.spend) {
      const allowedSpend = key.permissions.spend
      const hasSpendPermission = tokens.every(token =>
        allowedSpend.some(allowed =>
          !allowed.token || allowed.token.toLowerCase() === token.toLowerCase()
        )
      )
      if (!hasSpendPermission) return false
    }

    return true
  })

  if (suitableKeys.length === 0) return null

  // Return the most suitable key (longest expiry among suitable keys)
  return suitableKeys.reduce((best, current) =>
    current.expiry > best.expiry ? current : best
  )
}

/**
 * Contract addresses for permission checking
 */
export const RISE_CONTRACTS = {
  MockUSD: '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50',
  MockToken: '0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD',
  UniswapRouter: '0x6c10B45251F5D3e650bcfA9606c662E695Af97ea'
} as const

/**
 * Helper to extract contract addresses from transaction calls
 */
export function extractContractAddresses(calls: TransactionCall[]): string[] {
  return calls.map(call => call.to.toLowerCase())
}

/**
 * Helper to check if transaction calls match session key permissions
 */
export function checkTransactionPermissions(
  sessionKey: SessionKey,
  calls: TransactionCall[]
): { allowed: boolean; reason?: string } {
  const { canExecute, reason } = canExecuteCalls(sessionKey, calls)
  return { allowed: canExecute, reason }
}