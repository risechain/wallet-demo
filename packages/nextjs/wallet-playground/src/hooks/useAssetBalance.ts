import { MintableERC20ABI } from "@/abi/erc20";
import { Address } from "viem";
import { useReadContract } from "wagmi";

type UseBalanceProps = {
  accountAddress: Address;
  tokenAddress: Address;
  chainId?: number;
};

export function useAssetBalance({
  accountAddress,
  tokenAddress,
  chainId,
}: UseBalanceProps) {
  const {
    data: balance,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useReadContract({
    abi: MintableERC20ABI,
    address: tokenAddress,
    functionName: "balanceOf",
    args: [accountAddress],
    chainId: chainId as any,
    query: {
      enabled: !!accountAddress && !!tokenAddress,
    },
  });

  return {
    balance,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
