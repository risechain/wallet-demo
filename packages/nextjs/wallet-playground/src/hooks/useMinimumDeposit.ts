import { BridgeToken } from "@/config/tokens";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";

type UseMinimumDepositProps = {
  selectedToken: BridgeToken | undefined;
  selectedChainId: number;
};

export function useMinimumDeposit({
  selectedToken,
  selectedChainId,
}: UseMinimumDepositProps) {
  const data = useReadContract({
    abi: [
      {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "minAmounts",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    address: selectedToken?.bridgeWrapper,
    args: [selectedToken?.bridgeContract],
    chainId: selectedChainId as any,
    functionName: "minAmounts",
    query: {
      enabled:
        !!selectedToken?.bridgeWrapper && !!selectedToken?.bridgeContract,
    },
  });

  const {
    data: minAmounts,
    isLoading: isLoadingMinAmounts,
    isFetching: isFetchingMinAmounts,
    error,
  } = data;

  const minDepositAmount = useMemo(() => {
    if (!minAmounts || !selectedToken) return null;

    return formatUnits(minAmounts, selectedToken.decimals);
  }, [minAmounts, selectedToken]);

  return {
    minAmounts,
    minDepositAmount,
    isLoadingMinAmounts,
    isFetchingMinAmounts,
    error,
  };
}
