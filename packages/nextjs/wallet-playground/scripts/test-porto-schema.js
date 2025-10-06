#!/usr/bin/env node

/**
 * Test actual porto schema validation to understand why wallet_grantPermissions is failing
 * Uses the exact same validation logic as the dialog
 */

const path = require('path')

// We need to import the actual porto validation
// Let's use the compiled JS from the porto package
let portoRpcRequest, portoRpcSchema

try {
  // Try to import from node_modules
  portoRpcRequest = require('porto/core/internal/schema/request')
  portoRpcSchema = require('porto/core/internal/schema/rpc')
  console.log('✅ Successfully imported porto schema modules')
} catch (error) {
  console.log('❌ Could not import porto modules:', error.message)
  console.log('Let\'s run the test manually...')
}

// Mock data from your actual request
const mockRequestData = {
  "jsonrpc": "2.0",
  "method": "wallet_grantPermissions",
  "params": [
    {
      "key": {
        "publicKey": "0x21f40a5cc4c14e2395156128647870013f9d494afff16fb12c073f664c2544c30a49ad1ad0ed671f8b992f2a8318bec0bacb07b9d33d7db7d360961728d45efc",
        "type": "p256"
      },
      "expiry": 1759759822,
      "feeToken": null,
      "permissions": {
        "calls": [
          {
            "to": "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50"
          },
          {
            "to": "0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD"
          },
          {
            "to": "0x6c10B45251F5D3e650bcfA9606c662E695Af97ea"
          }
        ],
        "spend": [
          {
            "limit": "0x3635c9adc5dea00000",
            "period": "hour",
            "token": "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50"
          },
          {
            "limit": "0x3635c9adc5dea00000",
            "period": "hour",
            "token": "0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD"
          }
        ]
      }
    }
  ],
  "id": 1
}

// Test variations
const testVariations = [
  {
    name: "Original - feeToken: null",
    feeToken: null
  },
  {
    name: "Omitted - no feeToken field",
    feeToken: "OMIT"
  },
  {
    name: "Undefined - feeToken: undefined",
    feeToken: undefined
  },
  {
    name: "Minimal object - { limit: '1' }",
    feeToken: { limit: "1" }
  },
  {
    name: "ETH object - { limit: '1', symbol: 'ETH' }",
    feeToken: { limit: "1", symbol: "ETH" }
  },
  {
    name: "Native object - { limit: '1', symbol: 'native' }",
    feeToken: { limit: "1", symbol: "native" }
  },
  {
    name: "Decimal limit - { limit: '1.0' }",
    feeToken: { limit: "1.0" }
  },
  {
    name: "String limit - feeToken: 'ETH'",
    feeToken: "ETH"
  },
  {
    name: "Empty object - feeToken: {}",
    feeToken: {}
  }
]

// Manual validation test (without importing porto)
function manualTest() {
  console.log('\n🧪 Manual Testing Different feeToken Formats')
  console.log('='.repeat(60))

  testVariations.forEach((variation, index) => {
    console.log(`\n[${index + 1}] Testing: ${variation.name}`)

    // Create test request
    const testRequest = JSON.parse(JSON.stringify(mockRequestData))

    if (variation.feeToken === "OMIT") {
      delete testRequest.params[0].feeToken
      console.log('📤 feeToken: [OMITTED]')
    } else {
      testRequest.params[0].feeToken = variation.feeToken
      console.log('📤 feeToken:', JSON.stringify(variation.feeToken))
    }

    // Analyze the structure
    const params0 = testRequest.params[0]
    console.log('📋 Request structure:')
    console.log(`  - key: ${JSON.stringify(params0.key)}`)
    console.log(`  - expiry: ${params0.expiry}`)
    console.log(`  - feeToken: ${JSON.stringify(params0.feeToken)}`)
    console.log(`  - permissions.calls: ${params0.permissions.calls.length} items`)
    console.log(`  - permissions.spend: ${params0.permissions.spend.length} items`)

    // Check against known schema patterns
    let analysis = '❓ Unknown compatibility'

    if (variation.feeToken === null) {
      analysis = '✅ Should work - schema allows z.nullable(Key.FeeToken)'
    } else if (variation.feeToken === undefined || variation.feeToken === "OMIT") {
      analysis = '✅ Should work - feeToken is optional in permissions schema'
    } else if (typeof variation.feeToken === 'object' && variation.feeToken.limit) {
      if (typeof variation.feeToken.limit === 'string' && /^\d+(\.\d+)?$/.test(variation.feeToken.limit)) {
        analysis = '✅ Should work - matches Key.FeeToken schema'
      } else {
        analysis = '❌ May fail - limit format invalid'
      }
    } else {
      analysis = '❌ Likely to fail - doesn\'t match expected format'
    }

    console.log(`💡 Analysis: ${analysis}`)
  })
}

// Try to run porto validation if available
function portoValidationTest() {
  if (!portoRpcRequest || !portoRpcSchema) {
    console.log('\n⚠️  Porto modules not available - skipping validation test')
    return
  }

  console.log('\n🔍 Porto Schema Validation Test')
  console.log('='.repeat(60))

  testVariations.forEach((variation, index) => {
    console.log(`\n[${index + 1}] Validating: ${variation.name}`)

    try {
      // Create test request
      const testRequest = JSON.parse(JSON.stringify(mockRequestData))

      if (variation.feeToken === "OMIT") {
        delete testRequest.params[0].feeToken
      } else {
        testRequest.params[0].feeToken = variation.feeToken
      }

      // Use the same validation as the dialog
      const result = portoRpcRequest.validate(portoRpcRequest.Request, testRequest)
      console.log('✅ Validation passed!')
      console.log('📄 Result keys:', Object.keys(result))

    } catch (error) {
      console.log('❌ Validation failed:', error.message)
      if (error.details) {
        console.log('💡 Details:', error.details)
      }
    }
  })
}

async function runTests() {
  console.log('🚀 Porto Schema Validation Test Suite')
  console.log('📋 Testing wallet_grantPermissions feeToken validation')
  console.log('🎯 Goal: Understand why validation fails with "Expected object"')

  // Run manual analysis
  manualTest()

  // Try porto validation if available
  portoValidationTest()

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary:')
  console.log('- The error "Expected object" suggests feeToken cannot be null')
  console.log('- RISE might have custom validation overrides')
  console.log('- Try the minimal object format: { limit: "1" }')
  console.log('- The schema should allow null, so this might be a RISE-specific issue')
  console.log('='.repeat(60))
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests, testVariations, mockRequestData }