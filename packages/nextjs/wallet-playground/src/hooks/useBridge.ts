import { TokenConfig } from "@/config/tokens";
import { useMemo, useState } from "react";
import { Address, encodeFunctionData, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { TransactionCall, useTransaction } from "./useTransaction";

export type BridgeProps = {
  amount: bigint;
  account: Address;
  selectedToken: TokenConfig & {
    bridgeWrapper: Address;
    bridgeContract: Address;
  };
  shouldApprove?: boolean;
};

export type ApproveBridgeProps = {
  token: TokenConfig & {
    bridgeWrapper: Address;
    bridgeContract: Address;
  };
};

export function useBridge() {
  const { execute } = useTransaction();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  async function onBridge(props: BridgeProps) {
    const { account, amount, selectedToken } = props;

    setResult(null);
    setIsPending(true);
    const calls: TransactionCall[] = [];

    calls.push(
      {
        to: selectedToken.address,
        data: encodeFunctionData({
          abi: [
            parseAbiItem("function approve(address spender, uint256 amount)"),
          ],
          functionName: "approve",
          args: [selectedToken.bridgeWrapper, amount],
        }),
      },
      {
        to: selectedToken.bridgeWrapper,
        data: encodeFunctionData({
          abi: [
            parseAbiItem(
              "function bridgeLayerZero(address _bridge, uint256 _amount, address _recipient)",
            ),
          ],
          functionName: "bridgeLayerZero",
          args: [selectedToken.bridgeContract, amount, account],
        }),
      },
    );

    const response = await execute({
      calls,
      requiredPermissions: {
        calls: [selectedToken.bridgeWrapper.toLowerCase()],
      },
      selectedChainId: sepolia.id,
    });

    setIsPending(false);
    setResult(response);

    console.log("bridge-hook-response:: ", response);
    return response;
  }

  const isSuccess = useMemo(() => {
    return !!result?.success;
  }, [result?.success]);

  const error = useMemo(() => {
    return result?.error;
  }, [result?.error]);

  const errorMessage = useMemo(() => {
    return (
      result?.error?.shortMessage ??
      result?.error?.cause?.shortMessage ??
      result?.error?.message
    );
  }, [result?.error, isSuccess]);

  const data = useMemo(() => {
    return result?.data;
  }, [result?.data]);

  function reset() {
    setResult(null);
  }

  return {
    onBridge,
    isPending,
    errorMessage,
    isSuccess,
    error,
    data,
    reset,
  };
}
