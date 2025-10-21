"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { TOKENS } from "@/config/tokens";
import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";
import { cn, maskAddress } from "@/lib/utils";
import {
  executeTransaction,
  TransactionCall,
} from "@/utils/sessionKeyTransactions";
import { useCallback, useState } from "react";
import { encodeFunctionData } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function Mint() {
  const { address, connector } = useAccount();

  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } =
    useSessionKeys();
  const { preferSessionKey } = useSessionKeyPreference();

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey();
  const usableSessionKey = getUsableSessionKey();

  const [isMinting, setIsMinting] = useState(false);

  const [transactionResult, setTransactionResult] = useState<{
    hash: string;
    success: boolean;
    usedSessionKey?: boolean;
    keyId?: string;
  } | null>(null);

  const { data: hasMinted, isSuccess } = useReadContracts({
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

  // Smart mint function that uses session keys when available
  const handleMint = async (tokenSymbol: "MockUSD" | "MockToken") => {
    const token = TOKENS[tokenSymbol];
    setTransactionResult(null);

    if (!connector) {
      console.error("No connector available for minting");
      return;
    }

    setIsMinting(true);

    try {
      const mintData = encodeFunctionData({
        abi: MintableERC20ABI,
        functionName: "mintOnce",
        args: [],
      });

      const calls: TransactionCall[] = [
        {
          to: token.address,
          data: mintData,
          value: "0x0",
        },
      ];

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [token.address.toLowerCase()],
          },
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      );

      if (result.success) {
        setTransactionResult(result);
      } else {
        console.error("Session key mint failed:", result.error);
        // Could add UI error handling here if needed
      }
    } catch (err: any) {
      console.error("Smart mint error:", err);
      // Could add UI error handling here if needed
    } finally {
      setIsMinting(false);
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
                onClick={() => handleMint(token[1].symbol)}
                className={cn(isMinted(index) && "pointer-events-none")}
              >
                {isMinted(index) ? "Minted" : "Mint"}
              </Button>
            </div>
          );
        })}
      </div>
      <TransactionResult
        isSuccess={!!transactionResult?.hash}
        isSessionKey={transactionResult?.usedSessionKey}
        transactionHash={transactionResult?.hash}
        transactionAddr={transactionResult?.keyId}
      />
    </div>
  );
}
