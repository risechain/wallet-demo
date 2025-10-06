#!/usr/bin/env node

/**
 * Test the exact schema validation that's happening in the dialog
 * This will help us understand why validation is failing
 */

// We need to simulate what the dialog is doing exactly
// Let's create the exact request structure and validate it

const testRequestData = {
  "jsonrpc": "2.0",
  "method": "wallet_grantPermissions",
  "params": [
    {
      "key": {
        "publicKey": "0xedee7fe2d57f486f05dea03b58ed922254e6d27d5fd4ca6cd73709a6d7d59165e5b59ea19b2344cc7c30752d315d8d1bc491f60d350f4b9744186bf5d62c1f1b",
        "type": "p256"
      },
      "expiry": 1759759549,
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

// Test different feeToken variations
const feeTokenVariations = [
  {
    name: "null",
    value: null
  },
  {
    name: "undefined",
    value: undefined
  },
  {
    name: "omitted",
    value: "OMIT" // Special marker to omit the field
  },
  {
    name: "ETH object",
    value: {
      "limit": "1",
      "symbol": "ETH"
    }
  },
  {
    name: "native object",
    value: {
      "limit": "1",
      "symbol": "native"
    }
  },
  {
    name: "limit only",
    value: {
      "limit": "1"
    }
  }
]

console.log('🧪 Testing feeToken schema validation')
console.log('=====================================')

// Test each variation
feeTokenVariations.forEach(variation => {
  console.log(`\n🔍 Testing feeToken: ${variation.name}`)

  // Create test request
  const testRequest = JSON.parse(JSON.stringify(testRequestData))

  if (variation.value === "OMIT") {
    // Remove feeToken field entirely
    delete testRequest.params[0].feeToken
  } else {
    testRequest.params[0].feeToken = variation.value
  }

  console.log(`📤 feeToken value:`, JSON.stringify(testRequest.params[0].feeToken))

  // Log the full params structure for debugging
  console.log(`📋 Full params[0]:`, JSON.stringify(testRequest.params[0], null, 2))
})

console.log('\n💡 Notes:')
console.log('- The dialog validation happens before reaching the relayer')
console.log('- Error "Expected object" suggests the schema expects an object even when nullable')
console.log('- The issue might be in how the schema validates nullable objects')
console.log('- We need to check if RISE has custom validation rules')

console.log('\n🎯 Next steps:')
console.log('1. Check if RISE dialog has custom schema modifications')
console.log('2. Look at the exact error path in the validation')
console.log('3. Compare with working porto playground examples')
console.log('4. Test with a simple valid feeToken object')