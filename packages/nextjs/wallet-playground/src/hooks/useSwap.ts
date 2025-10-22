import { MintableERC20ABI } from "@/abi/erc20";
import { UniswapV2RouterABI } from "@/abi/swap";
import { UNISWAP_CONTRACTS } from "@/config/tokens";
import { useMemo, useState } from "react";
import { Address, encodeFunctionData, maxUint104 } from "viem";
import { TransactionCall, useTransaction } from "./useTransaction";

export type SwapProps = {
  amountIn: bigint;
  amountOutMin: bigint;
  fromAddress: Address;
  toAddress: Address;
  deadline: bigint;
  accountAddress: Address;
};

export function useSwap() {
  const { execute } = useTransaction();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  async function onSwap(props: SwapProps) {
    const {
      accountAddress,
      amountIn,
      amountOutMin,
      fromAddress,
      toAddress,
      deadline,
    } = props;

    setResult(null);
    setIsPending(true);
    const calls: TransactionCall[] = [];

    calls.push(
      // Approve first -- TODO: add handling for allowance check here
      // TODO: separate and use passkey temporarily
      {
        to: fromAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: MintableERC20ABI,
          functionName: "approve",
          args: [UNISWAP_CONTRACTS.router, maxUint104],
        }),
      },

      // Swap
      {
        to: UNISWAP_CONTRACTS.router,
        value: 0n,
        data: encodeFunctionData({
          abi: UniswapV2RouterABI,
          functionName: "swapExactTokensForTokens",
          args: [
            amountIn,
            amountOutMin,
            [fromAddress, toAddress],
            accountAddress,
            deadline,
          ],
        }),
      }
    );

    const response = await execute({
      calls,
      requiredPermissions: {
        calls: [
          fromAddress.toLowerCase(),
          UNISWAP_CONTRACTS.router.toLowerCase(),
        ],
      },
    });

    setIsPending(false);
    setResult(response);

    console.log("swap-hook-response:: ", response);
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
  }, [result?.error]);

  const data = useMemo(() => {
    return result?.data;
  }, [result?.data]);

  function reset() {
    setResult(null);
  }

  return {
    onSwap,
    isPending,
    errorMessage,
    isSuccess,
    error,
    data,
    reset,
  };
}
