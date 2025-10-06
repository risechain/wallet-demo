// Updated token addresses from degenRobot/devrel-trading-bot
export const TOKENS = {
  MockUSD: {
    address: '0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50' as `0x${string}`,
    decimals: 18,
    symbol: 'MockUSD',
    name: 'Mock USD',
  },
  MockToken: {
    address: '0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD' as `0x${string}`,
    decimals: 18,
    symbol: 'MockToken',
    name: 'Mock Token',
  },
} as const

// UniswapV2 contract addresses
export const UNISWAP_CONTRACTS = {
  factory: '0xf6A86076ce8e9A2ff628CD3a728FcC5876FA70C6' as `0x${string}`,
  router: '0x6c10B45251F5D3e650bcfA9606c662E695Af97ea' as `0x${string}`,
  pair: '0xf8da515e51e5B1293c2430d406aE41E6e5B9C992' as `0x${string}`,
}

// MintableERC20 ABI for mock tokens
export const MintableERC20ABI = [
  {
    type: 'function',
    name: 'mintOnce',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasMinted',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

// UniswapV2 Router ABI for swapping
export const UniswapV2RouterABI = [
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAmountsOut',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const