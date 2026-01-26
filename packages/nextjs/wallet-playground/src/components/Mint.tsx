"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { SUPPORTED_ASSETS, SUPPORTED_BRIDGE_ASSETS } from "@/config/tokens";
import { useMint } from "@/hooks/useMint";
import { useMintOnce } from "@/hooks/useMintOnce";
import { cn, maskAddress } from "@/lib/utils";
import { useCallback, useState } from "react";
import { riseTestnet, sepolia } from "viem/chains";
import { useAccount, useReadContracts } from "wagmi";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

export function Mint() {
  const { address } = useAccount();

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

  const handleMintOnce = async (
    asset: (typeof SUPPORTED_ASSETS)[number],
    index: number,
  ) => {
    setCurrentMintingIndex(index);

    // Use onMintOnce for swap tokens
    const response = await onMintOnce({ address: asset.address });
    if (response.success) {
      refetch();
    }
    setCurrentMintingIndex(null);
  };

  const handleMint = async (
    asset: (typeof SUPPORTED_BRIDGE_ASSETS)[number],
    index: number,
  ) => {
    setCurrentMintingIndex(index);
    await onMint({
      address,
      chainId: sepolia.id,
      tokenAddress: asset.address,
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="bg-secondary p-4 space-y-4 rounded-lg">
          <p className="text-sm">
            Mint MockUSD and MockToken on{" "}
            <span className="font-bold">RISE Testnet ({riseTestnet.id})</span>{" "}
            for testing. Each address can mint{" "}
            <span className="font-bold">1,000</span> per token.
          </p>
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
                      <p className="text-sm text-muted-foreground">
                        {asset.decimals} decimals
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isMinted(index) ? "success" : "default"}
                    disabled={isMinting || isMintingOnce}
                    onClick={() => handleMintOnce(asset, index)}
                    className={cn(isMinted(index) && "pointer-events-none")}
                  >
                    {isMinted(index) ? "Already Minted" : "Mint"}

                    {((currentMintingIndex === index && isPending) ||
                      (currentMintingIndex === index && isMintingOnce)) && (
                      <Spinner className="stroke-invert" />
                    )}
                  </Button>
                </div>
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
      </div>

      <div className="space-y-4">
        <div className="bg-secondary p-4 space-y-4 rounded-lg">
          <p className="text-sm">
            Mint USDC and USDT on{" "}
            <span className="font-bold">Sepolia ({sepolia.id})</span> for
            testing. Each address can mint{" "}
            <span className="font-bold">100</span> per token.
          </p>
          {SUPPORTED_BRIDGE_ASSETS.map((asset, index) => {
            return (
              <div key={asset.address}>
                <div className="flex gap-2 justify-between items-center w-full rounded-md p-3 bg-background">
                  <div className="">
                    <p className="text-sm">{asset.name}</p>
                    <div className="flex gap-2 items-center">
                      <p className="text-sm text-muted-foreground">
                        {maskAddress(asset.address)}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {asset.decimals} decimals
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={isMinting || isMintingOnce}
                    onClick={() => handleMint(asset, index)}
                  >
                    Mint
                    {currentMintingIndex === index && isMinting && (
                      <Spinner className="stroke-invert" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <TransactionResult
          isSuccess={isSuccessMint}
          isSessionKey={resultMint?.usedSessionKey}
          transactionHash={resultMint?.id}
          transactionAddr={resultMint?.id}
          errorMessage={errorMessageMint}
        />
      </div>
    </>
  );
}
