import { MintableERC20ABI } from "@/abi/erc20";
import { useState } from "react";
import { Address, encodeFunctionData, Hex } from "viem";
import { useTransaction } from "./useTransaction";

export type MintTokenProps = {
  address: Address;
  decimals?: number;
  symbol?: string;
  name?: string;
};

export type MintData = {
  hash: string;
  success: boolean;
  usedSessionKey?: boolean;
  keyId?: string;
};

export function useMint() {
  const { execute } = useTransaction();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const [error, setError] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [data, setData] = useState<MintData | null>(null);

  async function onMint(props: MintTokenProps) {
    const { address } = props;

    setIsPending(true);
    const calls: { to: Hex; data?: Hex; value?: bigint }[] = [];

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
    setData(response.data);
    setError(response.error);
    setIsSuccess(response.success);

    if (response.error) {
      setErrorMessage(response.error.details); // TODO: Fix assertion
    } else {
      setErrorMessage("");
    }
    return response;
  }

  return {
    onMint,
    data,
    isPending,
    error,
    errorMessage,
    isSuccess,
  };
}
