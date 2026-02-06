import { Value } from "ox";
import { Address, zeroAddress } from "viem";
import { riseTestnet, sepolia } from "viem/chains";

export type TokenConfig = {
  address: Address;
  decimals: number;
  symbol: string;
  name: string;
};

export type SupportedAsset = {
  address: Address;
  decimals: number;
  symbol: string;
  name: string;
  type: "swap" | "bridge";
};

export type BridgeToken = {
  address: Address;
  bridgeContract: Address;
  bridgeType: "layerzero";
  bridgeWrapper: Address;
  decimals: number;
  icon: string;
  minDeposit: bigint;
  name: string;
  symbol: string;
};

export type Chain = {
  icon: string;
  id: number;
  name: string;
};

// Updated token addresses from degenRobot/devrel-trading-bot
export const TOKENS = {
  MockUSD: {
    address: "0x044b54e85D3ba9ae376Aeb00eBD09F21421f7f50" as `0x${string}`,
    decimals: 18,
    symbol: "MockUSD",
    name: "Mock USD",
  },
  MockToken: {
    address: "0x6166a6e02b4CF0e1E0397082De1B4fc9CC9D6ceD" as `0x${string}`,
    decimals: 18,
    symbol: "MockToken",
    name: "Mock Token",
  },
} as const;

// UniswapV2 contract addresses
export const UNISWAP_CONTRACTS = {
  factory: "0xf6A86076ce8e9A2ff628CD3a728FcC5876FA70C6" as `0x${string}`,
  router: "0x6c10B45251F5D3e650bcfA9606c662E695Af97ea" as `0x${string}`,
  pair: "0xf8da515e51e5B1293c2430d406aE41E6e5B9C992" as `0x${string}`,
};

// Supported chains for bridging
export const SupportedChains: Chain[] = [
  {
    icon: "/icons/chains/sepolia.svg",
    id: sepolia.id,
    name: sepolia.name,
  },
];

// Hardcoded token configurations for bridging
export const BRIDGE_TOKENS: Record<number, BridgeToken[]> = {
  // Rise Testnet
  [riseTestnet.id]: [
    {
      address: "0x52b0b93aa1818359257149E005eC1AC2BCc3Eb1E" as `0x${string}`,
      bridgeContract:
        "0x52b0b93aa1818359257149E005eC1AC2BCc3Eb1E" as `0x${string}`,
      bridgeType: "layerzero",
      bridgeWrapper: zeroAddress,
      decimals: 18,
      icon: "/icons/tokens/usdc.svg",
      minDeposit: Value.from("10", 18), // 0.1 USDC
      name: "USDC",
      symbol: "USDC",
    },
    {
      address: "0x57BfEf022E97Ad3877381a72b7E32F019596919e" as `0x${string}`,
      bridgeContract:
        "0x57BfEf022E97Ad3877381a72b7E32F019596919e" as `0x${string}`,
      bridgeType: "layerzero",
      bridgeWrapper: zeroAddress,
      decimals: 18,
      icon: "/icons/tokens/usdt.svg",
      minDeposit: Value.from("10", 18), // 0.1 USDC
      name: "USDT",
      symbol: "USDT",
    },
  ],
  // Eth Sepolia
  11155111: [
    {
      address: "0x70315897fe28Dbe36DA81F10E1158bae1373C5b1" as `0x${string}`,
      bridgeContract:
        "0x2C752f3E245A89828590B30c93daAAD19f31c801" as `0x${string}`,
      bridgeType: "layerzero",
      bridgeWrapper: "0x226cefe884c9425377954fB9B5Cb9AD4BdCD398D",
      decimals: 18,
      icon: "/icons/tokens/usdc.svg",
      minDeposit: Value.from("10", 18), // 0.1 USDC
      name: "USDC",
      symbol: "USDC",
    },
    {
      address: "0x9Fe63D450edC97D700fA1D0081b84569102e5C1D" as `0x${string}`,
      bridgeContract:
        "0x046832405512D508b873E65174E51613291083bC" as `0x${string}`,
      bridgeType: "layerzero",
      bridgeWrapper: "0x226cefe884c9425377954fB9B5Cb9AD4BdCD398D",
      decimals: 18,
      icon: "/icons/tokens/usdt.svg",
      minDeposit: Value.from("10", 18), // 0.1 USDC
      name: "USDT",
      symbol: "USDT",
    },
  ],
};

// Supported assets for minting - combines swap tokens and bridge tokens
export const SUPPORTED_ASSETS: SupportedAsset[] = [
  // Swap tokens
  {
    address: TOKENS.MockUSD.address,
    decimals: TOKENS.MockUSD.decimals,
    symbol: TOKENS.MockUSD.symbol,
    name: TOKENS.MockUSD.name,
    type: "swap",
  },
  {
    address: TOKENS.MockToken.address,
    decimals: TOKENS.MockToken.decimals,
    symbol: TOKENS.MockToken.symbol,
    name: TOKENS.MockToken.name,
    type: "swap",
  },
];

export const SUPPORTED_BRIDGE_ASSETS: SupportedAsset[] = [
  // Bridge tokens on Rise Testnet
  // fix this
  {
    address: "0x70315897fe28Dbe36DA81F10E1158bae1373C5b1" as `0x${string}`,
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
    type: "bridge",
  },
  {
    address: "0x9Fe63D450edC97D700fA1D0081b84569102e5C1D" as `0x${string}`,
    decimals: 18,
    name: "USDT",
    symbol: "USDT",
    type: "bridge",
  },
];
