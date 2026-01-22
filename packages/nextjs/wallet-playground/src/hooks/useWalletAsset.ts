import { useQuery } from "@tanstack/react-query";
import type { Address } from "ox";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

export type UseWalletBalanceParams = {
  address: Address.Address;
  chainId?: number;
  tokenAddress?: Address.Address;
};

export function useWalletAsset(params: UseWalletBalanceParams) {
  const { address, chainId, tokenAddress } = params;

  const { connector } = useAccount();

  const {
    data: balance,
    refetch,
    isLoading,
  } = useQuery({
    enabled: Boolean(chainId && tokenAddress && address),
    async queryFn() {
      if (!chainId || !tokenAddress) return 0n;
      if (!connector) throw new Error("No connector available");

      const provider = (await connector.getProvider()) as any;

      const hexChainId = `0x${chainId.toString(16)}`;
      const isNative = tokenAddress.toLowerCase() === zeroAddress.toLowerCase();

      const intentParams = {
        account: address,
        assetFilter: {
          [hexChainId]: [
            {
              address: isNative ? ("native" as const) : tokenAddress,
              type: isNative ? "native" : "erc20",
            },
          ],
        },
        chainFilter: [hexChainId],
      };

      const response = await provider.request({
        method: "wallet_getAssets",
        params: [intentParams],
      });

      const assets = response[hexChainId] ?? [];
      const asset = assets[0];

      return asset ? BigInt(asset.balance) : 0n;
    },
    queryKey: ["wallet-asset-balance", chainId, tokenAddress, address],
  });

  return { balance, isLoading, refetch };
}
