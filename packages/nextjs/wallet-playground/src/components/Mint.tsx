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
import { CopyableAddress } from "./CopyableAddress";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";

export function Mint() {
  const { address, connector } = useAccount();

  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } =
    useSessionKeys();
  const { preferSessionKey } = useSessionKeyPreference();

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey();
  const usableSessionKey = getUsableSessionKey();

  const [currentToken, setCurrentToken] = useState<
    "MockUSD" | "MockToken" | null
  >(null);

  const [isSmartMinting, setIsSmartMinting] = useState(false);

  const [smartMintResult, setSmartMintResult] = useState<{
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
  const onMint = async (tokenSymbol: "MockUSD" | "MockToken") => {
    const token = TOKENS[tokenSymbol];
    setCurrentToken(tokenSymbol);
    setSmartMintResult(null);

    if (!connector) {
      console.error("No connector available for minting");
      return;
    }

    setIsSmartMinting(true);

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
        setSmartMintResult(result);
      } else {
        console.error("Session key mint failed:", result.error);
        // Could add UI error handling here if needed
      }
    } catch (err: any) {
      console.error("Smart mint error:", err);
      // Could add UI error handling here if needed
    } finally {
      setIsSmartMinting(false);
    }
  };

  return (
    <Card variant="secondary">
      <CardContent className="flex flex-col gap-2">
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
                disabled={isSmartMinting}
                onClick={() => onMint(token[1].symbol)}
                className={cn(isMinted(index) && "pointer-events-none")}
              >
                {isMinted(index) ? "Minted" : "Mint"}
              </Button>
            </div>
          );
        })}
      </CardContent>

      {/* Transaction Status */}
      {smartMintResult?.hash && (
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg text-sm">
          <div className="text-blue-300 flex items-center flex-wrap gap-1">
            <span>
              {smartMintResult?.usedSessionKey
                ? "🔑 Session key"
                : "🔐 Passkey"}{" "}
              {currentToken} mint tx:
            </span>
            <CopyableAddress
              address={smartMintResult?.hash || ""}
              prefix={8}
              suffix={6}
              className="text-blue-400"
            />
            <a
              href={`https://explorer.testnet.riselabs.xyz/tx/${smartMintResult?.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
              title="View on explorer"
            >
              ↗
            </a>
            {smartMintResult?.success && (
              <span className="text-green-400">✅</span>
            )}
          </div>
          {smartMintResult?.usedSessionKey && smartMintResult?.keyId && (
            <div className="text-blue-400 text-xs mt-1 flex items-center">
              Used key:
              <CopyableAddress
                address={smartMintResult.keyId}
                prefix={6}
                suffix={6}
                className="text-blue-400 ml-1"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
