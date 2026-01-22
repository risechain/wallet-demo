import { ErrorFormatter } from "@/lib/utils";
import type { Address } from "ox";
import { Value } from "ox";
import { useMemo, useState } from "react";
import { encodeFunctionData, parseAbiItem } from "viem";
import { useAccount } from "wagmi";

export type UseMintTokenParams = {
  address: Address.Address;
  tokenAddress?: Address.Address;
  chainId?: number;
};

export function useMint() {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const { connector } = useAccount();

  const onMint = async (params: UseMintTokenParams) => {
    const { address, chainId, tokenAddress } = params;
    if (!tokenAddress || !chainId) return;
    setIsPending(true);

    try {
      if (!connector) throw new Error("No connector available");

      const provider = (await connector.getProvider()) as any;

      const { id } = await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            calls: [
              {
                data: encodeFunctionData({
                  abi: [
                    parseAbiItem("function mint(address to, uint256 amount)"),
                  ],
                  args: [address, Value.from("100", 18)],
                  functionName: "mint",
                }),
                to: tokenAddress,
              },
            ],
            chainId: `0x${chainId.toString(16)}`,
          },
        ],
      });

      const status = await provider.request({
        method: "wallet_getCallsStatus",
        params: [id],
      });

      console.log("mint call:", status);

      setResult(status);
      return status;
    } catch (e) {
      const error = e as Error;
      const message =
        typeof error.cause === "string" ? error.cause : error.message;

      console.log(
        "mint error message:: ",
        ErrorFormatter.extractMessage(message),
      );
    } finally {
      setIsPending(false);
    }
  };

  const isSuccess = useMemo(() => {
    return result?.status === 200;
  }, [result?.success]);

  const error = useMemo(() => {
    return result?.error;
  }, [result?.error]);

  const errorMessage = useMemo(() => {
    return result.status === 200 ? "" : `Error with status: ${result.status}`;
  }, [result.status]);

  const data = useMemo(() => {
    return result;
  }, [result]);

  return { isPending, errorMessage, isSuccess, error, data, onMint };
}
