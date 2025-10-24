"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { TOKENS } from "@/config/tokens";
import { useMint } from "@/hooks/useMint";
import { cn, maskAddress } from "@/lib/utils";
import { useCallback } from "react";
import { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";

export function Mint() {
  const { address } = useAccount();

  const {
    onMint,
    isPending: isMinting,
    data: result,
    errorMessage,
    isSuccess: isMintSuccess,
  } = useMint();

  const {
    data: hasMinted,
    isSuccess,
    isPending,
    refetch,
  } = useReadContracts({
    contracts: [
      {
        address: TOKENS.MockUSD.address,
        abi: MintableERC20ABI,
        functionName: "hasMinted",
        args: [address],
      },
      {
        address: TOKENS.MockToken.address,
        abi: MintableERC20ABI,
        functionName: "hasMinted",
        args: [address],
      },
    ],
  } as any);

  const isMinted = useCallback(
    (index: number) => {
      if (isSuccess) {
        return Boolean(hasMinted[index].result);
      }
      return isSuccess;
    },
    [isSuccess]
  );

  const handleMint = async (address: Address) => {
    const response = await onMint({ address });
    if (response.success) {
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary p-4 space-y-4 rounded-lg">
        {Object.entries(TOKENS).map((token, index) => {
          return (
            <div
              key={token[0]}
              className="flex gap-2 justify-between items-center w-full rounded-md p-3 bg-background"
            >
              <div className="">
                <p className="text-sm">{token[1].name}</p>
                <div className="flex gap-2 items-center">
                  <p className="text-sm text-muted-foreground">
                    {maskAddress(token[1].address)}
                  </p>
                  <Separator orientation="vertical" className="min-h-4" />
                  <p className="text-sm text-muted-foreground">
                    {token[1].decimals} decimals
                  </p>
                </div>
              </div>
              <Button
                variant={isMinted(index) ? "success" : "default"}
                disabled={isMinting}
                onClick={() => handleMint(token[1].address)}
                className={cn(isMinted(index) && "pointer-events-none")}
              >
                {isMinted(index) ? "Already Minted" : "Mint"}

                {isPending && <Spinner className="stroke-invert" />}
              </Button>
            </div>
          );
        })}
      </div>
      <TransactionResult
        isSuccess={isMintSuccess}
        isSessionKey={result?.usedSessionKey}
        transactionHash={result?.id}
        transactionAddr={result?.id}
        errorMessage={errorMessage}
      />
    </div>
  );
}
