#!/usr/bin/env node

/**
 * Comprehensive debugging script to explore all possible issues
 * with wallet_grantPermissions
 */

console.log('🔍 COMPREHENSIVE DEBUG ANALYSIS')
console.log('='.repeat(60))

// What we know so far
const knownFacts = {
  chainId: 11155931, // RISE testnet
  dialogHost: 'https://rise-wallet-testnet.vercel.app/dialog',
  relayUrl: 'https://rise-testnet-porto.fly.dev',
  rpcUrl: 'https://testnet.riselabs.xyz',
  error: 'Validation failed with 1 error: - at `params[0].feeToken`: Expected object.',
  schemaAllowsNull: true, // z.nullable(Key.FeeToken)
  relaySupportsBasicRPC: true, // eth_chainId works
  relayRejectsWalletMethods: true, // wallet_grantPermissions = "Method not found"
}

console.log('📋 What we know:')
Object.entries(knownFacts).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`)
})

console.log('\n🤔 Potential issues to explore:')

const potentialIssues = [
  {
    issue: 'Wrong parameter structure',
    description: 'Maybe we\'re missing required fields or have the wrong format',
    test: 'Test minimal valid wallet_grantPermissions request'
  },
  {
    issue: 'Chain ID mismatch',
    description: 'Maybe the request needs explicit chainId parameter',
    test: 'Add chainId to request parameters'
  },
  {
    issue: 'Permission structure invalid',
    description: 'Maybe the permissions.calls or permissions.spend format is wrong',
    test: 'Test with minimal permissions'
  },
  {
    issue: 'Key format invalid',
    description: 'Maybe the key.publicKey or key.type format is wrong',
    test: 'Test with different key formats'
  },
  {
    issue: 'Expiry format invalid',
    description: 'Maybe expiry timestamp format is wrong',
    test: 'Test with different expiry formats'
  },
  {
    issue: 'Missing address parameter',
    description: 'Maybe we need to provide address parameter',
    test: 'Add address to request'
  },
  {
    issue: 'RISE-specific validation',
    description: 'RISE might have custom validation rules not in standard porto',
    test: 'Compare with RISE documentation'
  },
  {
    issue: 'Version mismatch',
    description: 'Our porto version might be different from RISE relay',
    test: 'Check package versions'
  }
]

potentialIssues.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.issue}`)
  console.log(`   📝 ${item.description}`)
  console.log(`   🧪 Test: ${item.test}`)
})

console.log('\n🔬 TEST PLAN:')
console.log('Let\'s create focused tests for each potential issue...\n')

// Test data
const basePublicKey = "0x21f40a5cc4c14e2395156128647870013f9d494afff16fb12c073f664c2544c30a49ad1ad0ed671f8b992f2a8318bec0bacb07b9d33d7db7d360961728d45efc"
const testAddress = "0x1234567890123456789012345678901234567890" // Mock address

// Generate test variations
const testVariations = [
  {
    name: "1. Minimal request (just required fields)",
    params: {
      key: { publicKey: basePublicKey, type: "p256" },
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "2. With explicit chainId",
    params: {
      key: { publicKey: basePublicKey, type: "p256" },
      expiry: Math.floor(Date.now() / 1000) + 3600,
      chainId: 11155931,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "3. With address parameter",
    params: {
      address: testAddress,
      key: { publicKey: basePublicKey, type: "p256" },
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "4. No key parameter (wallet-managed)",
    params: {
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "5. Different key type",
    params: {
      key: { publicKey: testAddress, type: "secp256k1" },
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "6. No spend permissions",
    params: {
      key: { publicKey: basePublicKey, type: "p256" },
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]
      }
    }
  },
  {
    name: "7. Copy exact porto playground format",
    params: {
      expiry: Math.floor(Date.now() / 1000) + 3600,
      feeToken: { limit: "1", symbol: "ETH" },
      permissions: {
        calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }],
        spend: [{
          limit: "0xde0b6b3a7640000", // 1 ETH
          period: "minute",
          token: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50"
        }]
      }
    }
  }
]

// Test each variation in our app context
console.log('📋 TEST VARIATIONS TO TRY IN APP:')
testVariations.forEach((variation, index) => {
  console.log(`\n${variation.name}`)
  console.log('```json')
  console.log(JSON.stringify(variation.params, null, 2))
  console.log('```')
})

console.log('\n💡 NEXT STEPS:')
console.log('1. Test these variations one by one in the app')
console.log('2. Check browser network tab for actual requests')
console.log('3. Look at the exact error details')
console.log('4. Compare with working porto playground examples')
console.log('5. Check if there are any RISE-specific docs/examples')

console.log('\n🔧 DEBUGGING STRATEGIES:')
console.log('- Add more detailed logging in the app')
console.log('- Intercept the actual HTTP request being made')
console.log('- Test with a working porto setup (playground)')
console.log('- Check if RISE has different validation rules')
console.log('- Look at the network requests in browser dev tools')

// Output a specific test to try first
console.log('\n🎯 RECOMMENDED FIRST TEST:')
console.log('Try variation #1 (minimal request) in your app:')
console.log('```javascript')
console.log('const defaultPermissions = {')
console.log('  expiry: Math.floor(Date.now() / 1000) + 3600,')
console.log('  feeToken: { limit: "1" },')
console.log('  permissions: {')
console.log('    calls: [{ to: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" }]')
console.log('  }')
console.log('}')
console.log('```')