import { ErrorFormatter } from "@/lib/utils";
import type { Address } from "ox";
import { Value } from "ox";
import { useEffect, useMemo, useState } from "react";
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
  const [statusCode, setStatusCode] = useState<number>(100);
  const [id, setId] = useState<string>("");

  const { connector } = useAccount();

  if (!connector) throw new Error("No connector available");

  const onMint = async (params: UseMintTokenParams) => {
    const { address, chainId, tokenAddress } = params;
    if (!tokenAddress || !chainId) return;
    setIsPending(true);

    const provider = (await connector.getProvider()) as any;

    try {
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

      setId(id);
      return id;
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

  // listener
  useEffect(() => {
    let isResolved = false;

    const getResult = async () => {
      let status: any;

      const provider = (await connector.getProvider()) as any;

      // If status is 100, keep retrying until it changes
      while (!isResolved) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        status = await provider.request({
          method: "wallet_getCallsStatus",
          params: [id],
        });

        console.log("mint call:", status);
        console.log("----------------");

        if (status.status !== 100) {
          setIsPending(false);
          setResult(status);
          isResolved = true;
          break;
        }
      }
    };

    getResult();

    return () => {
      isResolved = true;
    };
  }, [id]);

  const isSuccess = useMemo(() => {
    return result?.status === 200;
  }, [result?.success]);

  const error = useMemo(() => {
    return result?.error;
  }, [result?.error]);

  const errorMessage = useMemo(() => {
    if (!result) return "";

    return result?.status === 200 ? "" : `Error with status: ${result?.status}`;
  }, [result]);

  const data = useMemo(() => {
    return result;
  }, [result]);

  return { isPending, errorMessage, isSuccess, error, data, onMint };
}
