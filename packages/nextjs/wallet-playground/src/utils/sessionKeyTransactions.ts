'use client'

export interface TransactionCall {
  to: string
  data?: string
  value?: string
}

export interface SessionKeyTransactionResult {
  success: boolean
  hash?: string
  usedSessionKey?: boolean
  keyId?: string
  error?: string
}

export async function executeTransaction(
  calls: TransactionCall[],
  options: {
    preferSessionKey: boolean
    requiredPermissions?: {
      calls?: string[]
    }
  },
  connector: any,
  executeWithSessionKey: any,
  hasUsableSessionKey: boolean,
  usableSessionKey?: any
): Promise<SessionKeyTransactionResult> {

  // Check if we should and CAN use session keys
  if (options.preferSessionKey && hasUsableSessionKey && usableSessionKey) {
    try {
      // Validate permissions if required
      if (options.requiredPermissions?.calls) {
        const callAddresses = options.requiredPermissions.calls.map(addr => addr.toLowerCase())
        const keyPermissions = usableSessionKey.permissions?.calls || []

        // Check if session key has permission for all required calls
        const hasAllPermissions = callAddresses.every(requiredAddress =>
          keyPermissions.some((perm: any) =>
            !perm.to || perm.to.toLowerCase() === requiredAddress
          )
        )

        if (!hasAllPermissions) {
          // Session key lacks required permissions, fall back to passkey
          return executeWithPasskey(calls, connector)
        }
      }

      // Use the session key execution
      const result = await executeWithSessionKey(calls)
      return {
        ...result,
        keyId: usableSessionKey.id
      }
    } catch (error) {
      // Session key execution failed, fall through to passkey execution
      console.error('Session key execution failed:', error)
    }
  }

  // Fallback to regular transaction
  return executeWithPasskey(calls, connector)
}

async function executeWithPasskey(
  calls: TransactionCall[],
  connector: any
): Promise<SessionKeyTransactionResult> {
  try {
    let provider: any
    if (typeof connector.getProvider === 'function') {
      provider = await connector.getProvider()
    } else if (connector.request) {
      provider = connector
    } else {
      throw new Error('No provider available from connector')
    }

    // Use wallet_sendCalls for passkey transactions
    const { id } = await provider.request({
      method: 'wallet_sendCalls',
      params: [{ calls, version: '1' }],
    })

    return {
      success: true,
      hash: id,
      usedSessionKey: false,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      usedSessionKey: false,
    }
  }
}

export function extractContractAddresses(calls: TransactionCall[]): string[] {
  return calls.map(call => call.to.toLowerCase()).filter(Boolean)
}