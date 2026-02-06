import { ErrorFormatter } from "@/lib/utils";
import type { Address } from "ox";
import { Value } from "ox";
import { useMemo, useState } from "react";
import { encodeFunctionData, parseAbiItem } from "viem";
import { useAccount, useSendCallsSync } from "wagmi";
import { TransactionCall } from "./useTransaction";

export type UseMintTokenParams = {
  address: Address.Address;
  tokenAddress?: Address.Address;
  chainId?: number;
};

export function useMint() {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const { connector } = useAccount();
  const { sendCallsSyncAsync } = useSendCallsSync();

  if (!connector) throw new Error("No connector available");

  const onMint = async (params: UseMintTokenParams) => {
    const { address, chainId, tokenAddress } = params;
    if (!tokenAddress || !chainId) return;
    setIsPending(true);

    try {
      const calls: TransactionCall[] = [];
      calls.push({
        data: encodeFunctionData({
          abi: [parseAbiItem("function mint(address to, uint256 amount)")],
          args: [address, Value.from("100", 18)],
          functionName: "mint",
        }),
        to: tokenAddress,
      });

      const response = await sendCallsSyncAsync({
        calls,
        version: "1",
        chainId,
        timeout: 60_000,
      } as any);

      console.log("response:: ", response);

      setIsPending(false);
      setResult(response);
      return response;
    } catch (e) {
      setIsPending(false);
      const error = e as Error;
      const message =
        typeof error.cause === "string" ? error.cause : error.message;

      console.log(
        "mint error message:: ",
        ErrorFormatter.extractMessage(message),
      );
    }
  };

  const isSuccess = useMemo(() => {
    return result?.status === "success";
  }, [result?.status]);

  const error = useMemo(() => {
    return result?.error;
  }, [result?.error]);

  const errorMessage = useMemo(() => {
    if (!result) return "";

    return result?.status === "success"
      ? ""
      : `Error with status: ${result?.status}`;
  }, [result]);

  const data = useMemo(() => {
    return result;
  }, [result]);

  return { isPending, errorMessage, isSuccess, error, data, onMint };
}
