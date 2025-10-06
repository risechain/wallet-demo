'use client'

import type { SessionKey } from '@/hooks/useSessionKeys'
import { Hex } from 'viem'

export interface TransactionCall {
  to: string
  data?: string
  value?: string
}

export interface SessionKeyTransactionResult {
  hash: string
  success: boolean
  error?: string
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
    const provider = await connector.getProvider()
    const chainId = await provider.request({ method: 'eth_chainId' })

    // Step 1: Prepare the calls with the session key
    const { digest, ...request } = await provider.request({
      method: 'wallet_prepareCalls',
      params: [
        {
          calls,
          chainId,
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
 * Contract addresses for permission checking
 */
export const RISE_CONTRACTS = {
  MockUSD: '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50',
  MockToken: '0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD',
  UniswapRouter: '0x6c10B45251F5D3e650bcfA9606c662E695Af97ea'
} as const