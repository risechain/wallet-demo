#!/usr/bin/env node

/**
 * Test script to systematically test wallet_grantPermissions with RISE relayer
 * Run with: node scripts/test-relayer.js
 */

const { P256, PublicKey } = require('ox')

// RISE testnet configuration
const RISE_CONFIG = {
  relayUrl: 'https://rise-testnet-porto.fly.dev',
  chainId: 11155931, // RISE testnet chain ID
  contracts: {
    MockUSD: '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50',
    MockToken: '0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD',
    UniswapRouter: '0x6c10B45251F5D3e650bcfA9606c662E695Af97ea'
  }
}

// Generate a test key pair
function generateTestKey() {
  const privateKey = P256.randomPrivateKey()
  const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
    includePrefix: false,
  })
  return { privateKey, publicKey }
}

// Base permission structure
function createBasePermissions(publicKey) {
  return {
    key: { publicKey, type: 'p256' },
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    permissions: {
      calls: [
        { to: RISE_CONFIG.contracts.MockUSD },
        { to: RISE_CONFIG.contracts.MockToken },
        { to: RISE_CONFIG.contracts.UniswapRouter }
      ],
      spend: [
        {
          limit: '0x3635c9adc5dea00000', // 1000 tokens in hex
          period: 'hour',
          token: RISE_CONFIG.contracts.MockUSD
        },
        {
          limit: '0x3635c9adc5dea00000', // 1000 tokens in hex
          period: 'hour',
          token: RISE_CONFIG.contracts.MockToken
        }
      ]
    }
  }
}

// Test cases to try
function createTestCases(publicKey) {
  const base = createBasePermissions(publicKey)

  return [
    {
      name: 'No feeToken (omitted completely)',
      params: base
    },
    {
      name: 'feeToken: null',
      params: { ...base, feeToken: null }
    },
    {
      name: 'feeToken: undefined',
      params: { ...base, feeToken: undefined }
    },
    {
      name: 'feeToken with limit and ETH symbol',
      params: {
        ...base,
        feeToken: { limit: '1', symbol: 'ETH' }
      }
    },
    {
      name: 'feeToken with limit and native symbol',
      params: {
        ...base,
        feeToken: { limit: '1', symbol: 'native' }
      }
    },
    {
      name: 'feeToken with limit only',
      params: {
        ...base,
        feeToken: { limit: '1' }
      }
    },
    {
      name: 'feeToken with different limit format',
      params: {
        ...base,
        feeToken: { limit: '1.0', symbol: 'ETH' }
      }
    },
    {
      name: 'feeToken as empty object',
      params: {
        ...base,
        feeToken: {}
      }
    },
    {
      name: 'feeToken as string ETH',
      params: {
        ...base,
        feeToken: 'ETH'
      }
    },
    {
      name: 'No permissions.spend (calls only)',
      params: {
        ...base,
        feeToken: null,
        permissions: {
          calls: base.permissions.calls
        }
      }
    }
  ]
}

// Test a single case
async function testCase(testCase, caseNumber, total) {
  console.log(`\n[${ caseNumber }/${ total }] 🧪 Testing: ${ testCase.name }`)
  console.log('📤 Request params:', JSON.stringify(testCase.params, null, 2))

  const requestBody = {
    jsonrpc: '2.0',
    method: 'wallet_grantPermissions',
    params: [testCase.params],
    id: caseNumber,
  }

  try {
    const response = await fetch(RISE_CONFIG.relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if (result.error) {
      console.log('❌ Error:', result.error.message)
      if (result.error.data) {
        console.log('💡 Error details:', JSON.stringify(result.error.data, null, 2))
      }
      return { success: false, error: result.error }
    } else {
      console.log('✅ Success!')
      console.log('📄 Response keys:', Object.keys(result.result || result))
      return { success: true, result: result.result || result }
    }
  } catch (error) {
    console.log('💥 Request failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 RISE Testnet Relayer Test Suite')
  console.log('📡 Relay URL:', RISE_CONFIG.relayUrl)
  console.log('⛓️  Chain ID:', RISE_CONFIG.chainId)
  console.log('📋 Contracts:', JSON.stringify(RISE_CONFIG.contracts, null, 2))

  // Generate test key
  const { privateKey, publicKey } = generateTestKey()
  console.log('\n🔑 Generated test key:')
  console.log('Private Key:', privateKey)
  console.log('Public Key:', publicKey)

  // Create test cases
  const testCases = createTestCases(publicKey)
  console.log(`\n📝 Running ${ testCases.length } test cases...\n`)

  const results = []

  for (let i = 0; i < testCases.length; i++) {
    const result = await testCase(testCases[i], i + 1, testCases.length)
    results.push({
      name: testCases[i].name,
      ...result
    })

    // Wait between requests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ Successful: ${ successful.length }`)
  console.log(`❌ Failed: ${ failed.length }`)

  if (successful.length > 0) {
    console.log('\n🎉 Successful test cases:')
    successful.forEach(r => console.log(`  • ${ r.name }`))
  }

  if (failed.length > 0) {
    console.log('\n💥 Failed test cases:')
    failed.forEach(r => console.log(`  • ${ r.name }: ${ r.error.message || r.error }`))
  }

  console.log('\n' + '='.repeat(60))

  return results
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests, createTestCases, RISE_CONFIG }