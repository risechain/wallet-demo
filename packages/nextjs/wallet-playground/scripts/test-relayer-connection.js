#!/usr/bin/env node

/**
 * Simple test to check relayer connectivity and available methods
 * Run with: node scripts/test-relayer-connection.js
 */

const RELAYER_URL = 'https://rise-testnet-porto.fly.dev'

async function testMethod(methodName, params = []) {
  console.log(`\n🔍 Testing method: ${methodName}`)

  const requestBody = {
    jsonrpc: '2.0',
    method: methodName,
    params: params,
    id: 1,
  }

  try {
    const response = await fetch(RELAYER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`)
      if (result.error.code) {
        console.log(`📝 Error code: ${result.error.code}`)
      }
    } else {
      console.log('✅ Success!')
      console.log('📄 Response:', JSON.stringify(result, null, 2))
    }

    return result
  } catch (error) {
    console.log(`💥 Request failed: ${error.message}`)
    return { error: error.message }
  }
}

async function testConnectivity() {
  console.log('🌐 Testing RISE Testnet Porto Relayer Connectivity')
  console.log('📡 URL:', RELAYER_URL)

  // Test basic connectivity
  console.log('\n1. Testing basic HTTP connectivity...')
  try {
    const response = await fetch(RELAYER_URL, {
      method: 'GET',
    })
    console.log(`✅ HTTP GET response: ${response.status} ${response.statusText}`)
  } catch (error) {
    console.log(`❌ HTTP GET failed: ${error.message}`)
  }

  // Test JSON-RPC connectivity
  console.log('\n2. Testing JSON-RPC methods...')

  const methodsToTest = [
    'porto_ping',
    'eth_chainId',
    'eth_accounts',
    'wallet_getCapabilities',
    'wallet_grantPermissions',
    'wallet_connect',
    'rpc_methods', // Sometimes relayers expose this
    'eth_getBalance'
  ]

  for (const method of methodsToTest) {
    await testMethod(method)
    await new Promise(resolve => setTimeout(resolve, 500)) // Small delay
  }

  console.log('\n' + '='.repeat(50))
  console.log('💡 Connectivity test complete!')
  console.log('If wallet_grantPermissions returns "Method not found",')
  console.log('it likely means the method is only available through')
  console.log('the wallet interface, not direct HTTP calls.')
  console.log('='.repeat(50))
}

// Run if called directly
if (require.main === module) {
  testConnectivity().catch(console.error)
}

module.exports = { testMethod, testConnectivity }