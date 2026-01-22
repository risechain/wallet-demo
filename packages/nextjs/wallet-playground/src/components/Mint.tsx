"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { SUPPORTED_ASSETS } from "@/config/tokens";
import { useMint } from "@/hooks/useMint";
import { useMintOnce } from "@/hooks/useMintOnce";
import { cn, maskAddress } from "@/lib/utils";
import { useCallback, useState } from "react";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";

export function Mint() {
  const { address } = useAccount();
  const chainId = useChainId();

  const {
    onMintOnce,
    isPending: isMintingOnce,
    data: resultOnce,
    errorMessage: errorMessageOnce,
    isSuccess: isMintSuccessOnce,
  } = useMintOnce();

  // Use onMintBridge for bridge tokens
  const {
    onMint,
    isPending: isMinting,
    data: resultMint,
    errorMessage: errorMessageMint,
    isSuccess: isSuccessMint,
  } = useMint();

  const [currentMintingIndex, setCurrentMintingIndex] = useState<number | null>(
    null,
  );

  const [bridgeMintResults, setBridgeMintResults] = useState<
    Record<number, any>
  >({});

  const {
    data: hasMinted,
    isSuccess,
    isPending,
    refetch,
  } = useReadContracts({
    contracts: SUPPORTED_ASSETS.map((asset) => ({
      address: asset.address,
      abi: MintableERC20ABI,
      functionName: "hasMinted",
      args: [address],
    })),
  } as any);

  const isMinted = useCallback(
    (index: number) => {
      if (isSuccess) {
        return Boolean(hasMinted[index].result);
      }
      return isSuccess;
    },
    [isSuccess, hasMinted],
  );

  const handleMint = async (
    asset: (typeof SUPPORTED_ASSETS)[number],
    index: number,
  ) => {
    setCurrentMintingIndex(index);

    if (asset.type === "swap") {
      // Use onMintOnce for swap tokens
      const response = await onMintOnce({ address: asset.address });
      if (response.success) {
        refetch();
      }
    } else {
      const response = await onMint({
        address,
        chainId,
        tokenAddress: asset.address,
      });
      if (response) {
        setBridgeMintResults((prev) => ({ ...prev, [index]: response }));
        refetch();
      }
    }

    setCurrentMintingIndex(null);
  };

  console.log("resultMint:: ", resultMint);
  return (
    <div className="space-y-4">
      <div className="bg-secondary p-4 space-y-4 rounded-lg">
        {SUPPORTED_ASSETS.map((asset, index) => {
          return (
            <div key={asset.address}>
              <div className="flex gap-2 justify-between items-center w-full rounded-md p-3 bg-background">
                <div className="">
                  <p className="text-sm">{asset.name}</p>
                  <div className="flex gap-2 items-center">
                    <p className="text-sm text-muted-foreground">
                      {maskAddress(asset.address)}
                    </p>
                    <Separator orientation="vertical" className="min-h-4" />
                    <p className="text-sm text-muted-foreground">
                      {asset.decimals} decimals
                    </p>
                  </div>
                </div>
                <Button
                  variant={isMinted(index) ? "success" : "default"}
                  disabled={currentMintingIndex !== null || isMintingOnce}
                  onClick={() => handleMint(asset, index)}
                  className={cn(isMinted(index) && "pointer-events-none")}
                >
                  {isMinted(index) ? "Already Minted" : "Mint"}

                  {(currentMintingIndex === index || isPending) && (
                    <Spinner className="stroke-invert" />
                  )}
                </Button>
              </div>
              {index < SUPPORTED_ASSETS.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          );
        })}
      </div>

      <TransactionResult
        isSuccess={isMintSuccessOnce}
        isSessionKey={resultOnce?.usedSessionKey}
        transactionHash={resultOnce?.id}
        transactionAddr={resultOnce?.id}
        errorMessage={errorMessageOnce}
      />

      <TransactionResult
        isSuccess={isSuccessMint}
        isSessionKey={resultMint?.usedSessionKey}
        transactionHash={resultMint?.id}
        transactionAddr={resultMint?.id}
        errorMessage={errorMessageMint}
      />
    </div>
  );
}
