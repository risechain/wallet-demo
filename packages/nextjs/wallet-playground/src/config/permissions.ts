import { keccak256, parseEther, toHex } from "viem";
import { TOKENS, UNISWAP_CONTRACTS } from "./tokens";

export const CALLS = [
  {
    to: TOKENS.MockUSD.address,
    signature: keccak256(toHex("transfer(address,uint256)")).slice(0, 10),
  },
  {
    to: TOKENS.MockToken.address,
    signature: keccak256(toHex("transfer(address,uint256)")).slice(0, 10),
  },
  {
    to: TOKENS.MockUSD.address,
    signature: keccak256(toHex("approve(address,uint256)")).slice(0, 10),
  },
  {
    to: TOKENS.MockToken.address,
    signature: keccak256(toHex("approve(address,uint256)")).slice(0, 10),
  },
  {
    to: UNISWAP_CONTRACTS.router,
    signature: keccak256(
      toHex(
        "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
      )
    ).slice(0, 10),
  },
];

export const SPEND = [
  {
    // limit: Value.fromEther("50"),
    limit: parseEther("50"),
    period: "minute" as const,
    token: TOKENS.MockUSD.address,
  },
  {
    // limit: Value.fromEther("50"),
    limit: parseEther("50"),
    period: "minute" as const,
    token: TOKENS.MockToken.address,
  },
];

export const PERMISSIONS = {
  calls: CALLS,
  spend: SPEND,
};
