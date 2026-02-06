import { MintableERC20ABI } from "@/abi/erc20";
import { useMemo, useState } from "react";
import { Address, encodeFunctionData } from "viem";
import { TransactionCall, useTransaction } from "./useTransaction";

export type MintTokenProps = {
  address: Address;
  decimals?: number;
  symbol?: string;
  name?: string;
};

export function useMintOnce() {
  const { execute } = useTransaction();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  async function onMintOnce(props: MintTokenProps) {
    const { address } = props;

    setResult(null);
    setIsPending(true);
    const calls: TransactionCall[] = [];

    calls.push({
      to: address,
      data: encodeFunctionData({
        abi: MintableERC20ABI,
        functionName: "mintOnce",
        args: [],
      }),
    });

    const response = await execute({
      calls,
      requiredPermissions: { calls: [address.toLowerCase()] },
    });

    setIsPending(false);
    setResult(response);

    console.log("mint-hook-response:: ", response);
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

  return {
    onMintOnce,
    isPending,
    errorMessage,
    isSuccess,
    error,
    data,
  };
}
