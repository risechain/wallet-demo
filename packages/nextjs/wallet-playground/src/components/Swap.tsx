"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { UniswapV2RouterABI } from "@/abi/swap";
import { TOKENS, UNISWAP_CONTRACTS } from "@/config/tokens";
import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";
import {
  executeTransaction,
  TransactionCall,
} from "@/utils/sessionKeyTransactions";
import { ArrowDownUp, Check, Key, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { CopyableAddress } from "./CopyableAddress";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

type TokenSymbol = keyof typeof TOKENS;

export function Swap() {
  const { address, isConnected, connector } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [fromToken, setFromToken] = useState<TokenSymbol>("MockUSD");
  const [toToken, setToToken] = useState<TokenSymbol>("MockToken");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [error, setError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [smartTxResult, setSmartTxResult] = useState<{
    hash: string;
    success: boolean;
    usedSessionKey?: boolean;
    keyId?: string;
  } | null>(null);

  // Session key hooks
  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } =
    useSessionKeys();
  const { preferSessionKey } = useSessionKeyPreference();

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey();
  const usableSessionKey = getUsableSessionKey();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fromTokenConfig = TOKENS[fromToken];
  const toTokenConfig = TOKENS[toToken];

  // Get balances
  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address,
    token: fromTokenConfig.address,
    query: {
      refetchInterval: 10000,
    },
  });

  const { data: toBalance, refetch: refetchToBalance } = useBalance({
    address,
    token: toTokenConfig.address,
    query: {
      refetchInterval: 10000,
    },
  });

  // Check for usable session key using the updated approach
  const requiredContracts = [
    fromTokenConfig.address.toLowerCase(),
    UNISWAP_CONTRACTS.router.toLowerCase(),
  ];

  // Check allowance
  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: allowanceLoading,
    error: allowanceError,
  } = useReadContract({
    address: fromTokenConfig.address,
    abi: MintableERC20ABI,
    functionName: "allowance",
    args: address ? [address, UNISWAP_CONTRACTS.router] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Parse amount for quote
  const amountInBigInt = (() => {
    try {
      if (!fromAmount || fromAmount.trim() === "") return undefined;
      const numAmount = parseFloat(fromAmount);
      if (isNaN(numAmount) || numAmount <= 0) return undefined;
      return parseUnits(fromAmount, fromTokenConfig.decimals);
    } catch (error) {
      console.log("❌ Amount parsing error:", error);
      return undefined;
    }
  })();

  const contractArgs =
    amountInBigInt && fromToken !== toToken
      ? [amountInBigInt, [fromTokenConfig.address, toTokenConfig.address]]
      : undefined;

  // Get quote
  const {
    data: quoteData,
    isLoading: quoteLoading,
    error: quoteError,
    isError: quoteIsError,
    refetch: refetchQuote,
  } = useReadContract({
    address: UNISWAP_CONTRACTS.router,
    abi: UniswapV2RouterABI,
    functionName: "getAmountsOut",
    args: contractArgs,
    query: {
      enabled:
        !!contractArgs &&
        !!amountInBigInt &&
        fromToken !== toToken &&
        !!address,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  });

  // Update quote amount
  useEffect(() => {
    if (quoteData && Array.isArray(quoteData) && quoteData.length >= 2) {
      try {
        const outputAmount = formatUnits(quoteData[1], toTokenConfig.decimals);
        const formattedAmount = parseFloat(outputAmount).toFixed(6);
        setToAmount(formattedAmount);
        setError("");
      } catch (formatError) {
        console.log("❌ Quote Format Error:", formatError);
        setToAmount("");
        setError("Error formatting quote");
      }
    } else if (quoteIsError || quoteError) {
      setToAmount("");
      setError(
        quoteError?.message?.includes("INSUFFICIENT_OUTPUT_AMOUNT")
          ? "Insufficient liquidity"
          : "Quote failed - check liquidity"
      );
    } else if (!fromAmount || fromAmount.trim() === "") {
      setToAmount("");
      setError("");
    }
  }, [
    quoteData,
    quoteLoading,
    quoteIsError,
    quoteError,
    fromAmount,
    toTokenConfig.decimals,
  ]);

  // Check if approval needed
  const needsApproval = (() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return false;
    if (allowance === undefined || allowance === null) return true;

    try {
      const requiredAmount = parseUnits(fromAmount, fromTokenConfig.decimals);
      return allowance < requiredAmount;
    } catch (error) {
      return true;
    }
  })();

  // Smart approve function using the new executeTransaction
  const handleSmartApprove = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;

    setError("");
    setSmartTxResult(null);
    setIsExecuting(true);

    if (!connector) {
      console.error("No connector available for smart approval");
      setIsExecuting(false);
      return;
    }

    try {
      const maxAmount = parseUnits("1000000000", fromTokenConfig.decimals);

      const approveCallData = encodeFunctionData({
        abi: MintableERC20ABI,
        functionName: "approve",
        args: [UNISWAP_CONTRACTS.router, maxAmount],
      });

      const calls: TransactionCall[] = [
        {
          to: fromTokenConfig.address,
          data: approveCallData,
          value: "0x0",
        },
      ];

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [fromTokenConfig.address.toLowerCase()],
          },
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      );

      if (result.success) {
        setSmartTxResult(result);
        // Refetch allowance after a delay
        setTimeout(() => {
          refetchAllowance();
          refetchFromBalance();
        }, 2000);
      } else {
        setError(`Approval failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error("❌ Smart approve error:", err);
      setError(`Approval failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Smart swap function using the new executeTransaction
  const handleSmartSwap = async () => {
    if (!fromAmount || !toAmount) return;

    setError("");
    setIsExecuting(true);

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError("Enter an amount");
      setIsExecuting(false);
      return;
    }

    if (!toAmount || parseFloat(toAmount) <= 0) {
      setError("No quote available");
      setIsExecuting(false);
      return;
    }

    if (!connector) {
      setError("No connector available");
      setIsExecuting(false);
      return;
    }

    try {
      const amountIn = parseUnits(fromAmount, fromTokenConfig.decimals);
      if (fromBalance && amountIn > fromBalance.value) {
        setError("Insufficient balance");
        setIsExecuting(false);
        return;
      }

      const estimatedAmountOut = parseFloat(toAmount);
      const minAmountOut = estimatedAmountOut * 0.8; // 20% slippage
      const amountOutMin = parseUnits(
        minAmountOut.toString(),
        toTokenConfig.decimals
      );
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes

      const swapCallData = encodeFunctionData({
        abi: UniswapV2RouterABI,
        functionName: "swapExactTokensForTokens",
        args: [
          amountIn,
          amountOutMin,
          [fromTokenConfig.address, toTokenConfig.address],
          address,
          deadline,
        ],
      });

      const calls: TransactionCall[] = [
        {
          to: UNISWAP_CONTRACTS.router,
          data: swapCallData,
          value: "0x0",
        },
      ];

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: [UNISWAP_CONTRACTS.router.toLowerCase()],
          },
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      );

      if (result.success) {
        setSmartTxResult(result);
        setFromAmount("");
        setToAmount("");
        setError("");
        // Refetch balances after a delay
        setTimeout(() => {
          refetchFromBalance();
          refetchToBalance();
        }, 2000);
      } else {
        setError(`Swap failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error("❌ Smart swap error:", err);
      setError(`Swap failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTokenSwitch = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
    setToAmount("");
    setError("");
    setSmartTxResult(null);
  };

  const handleMaxClick = () => {
    if (fromBalance) {
      const maxAmount = formatUnits(fromBalance.value, fromBalance.decimals);
      setFromAmount(maxAmount);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-700 rounded w-1/3 mx-auto"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-8 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <p className="text-gray-300 font-medium">Connect your wallet to swap</p>
      </div>
    );
  }

  const isTransacting = false; // No longer using wagmi transactions
  const canSwap = Boolean(
    fromAmount &&
      toAmount &&
      !needsApproval &&
      !isTransacting &&
      !quoteLoading &&
      !allowanceLoading &&
      parseFloat(fromAmount) > 0 &&
      parseFloat(toAmount) > 0 &&
      !error &&
      address &&
      allowance !== undefined
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-2 justify-between items-center">
          <p className="text-xl">Swap</p>
          <p className="text-sm font-normal">
            {preferSessionKey && usableSessionKey && (
              <span className="text-success">Session key ready</span>
            )}
            {preferSessionKey && !usableSessionKey && (
              <span className="text-destructive">
                No session key available!
              </span>
            )}
            {!preferSessionKey && !usableSessionKey && (
              <span className="text-destructive">Session key deactivated!</span>
            )}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* From Section */}
        <div className="bg-secondary/50 p-6 rounded-lg">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">From</p>
              <span className="text-sm text-muted-foreground">
                Balance:{" "}
                {fromBalance
                  ? Number.parseFloat(
                      formatUnits(
                        fromBalance?.value ?? 0n,
                        fromBalance.decimals
                      )
                    ).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex flex-1 gap-2 items-center border rounded-lg pr-3 bg-background">
                <Input
                  type="number"
                  id="from"
                  placeholder="0"
                  className="border-none"
                  value={fromAmount}
                  onChange={(e) => {
                    setFromAmount(e.target.value);
                    setError("");
                    setSmartTxResult(null);
                  }}
                />
                <p className="text-sm text-muted-foreground font-semibold">
                  {fromTokenConfig.symbol}
                </p>
              </div>
              <Button variant="outline" onClick={handleMaxClick}>
                Max
              </Button>
            </div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleTokenSwitch}
            className="p-2 rounded-full border"
          >
            <ArrowDownUp />
          </Button>
        </div>

        {/* To Section */}
        <div className="bg-secondary/50 p-6 rounded-lg">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">To</p>
              <span className="text-sm text-muted-foreground">
                Balance:{" "}
                {fromBalance
                  ? Number.parseFloat(
                      formatUnits(toBalance?.value ?? 0n, toBalance.decimals)
                    ).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex flex-1 gap-2 items-center border rounded-lg pr-3 bg-background">
                <Input
                  type="text"
                  id="to"
                  readOnly
                  placeholder="0"
                  className="border-none"
                  value={quoteLoading ? "please wait..." : toAmount}
                  onChange={(e) => {
                    setFromAmount(e.target.value);
                    setError("");
                    setSmartTxResult(null);
                  }}
                />
                <p className="text-sm text-muted-foreground font-semibold">
                  {toTokenConfig.symbol}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          {needsApproval && !smartTxResult?.success ? (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-600/5 rounded-lg">
                <p className="text-sm text-yellow-300">
                  You need to approve {fromTokenConfig.symbol} spending first
                </p>
              </div>
              <Button
                onClick={handleSmartApprove}
                disabled={
                  isExecuting || !fromAmount || parseFloat(fromAmount) <= 0
                }
                className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
              >
                {isExecuting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Approving...
                  </div>
                ) : (
                  `${preferSessionKey && usableSessionKey ? "🔑" : "🔐"} Approve ${fromTokenConfig.symbol}`
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSmartSwap}
              disabled={isExecuting || !canSwap}
              className="w-full"
              size="xl"
            >
              {isExecuting ? <Spinner className="stroke-invert" /> : "Swap"}
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/5 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Transaction Success Popup */}
        {smartTxResult?.hash && (
          <div className="p-3 bg-success/5 rounded-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="flex items-center gap-2 text-sm text-success">
                {smartTxResult?.usedSessionKey ? (
                  <>
                    <Key size={16} />
                    Successful Transaction using Session Key!
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Successful Transaction using PassKey!
                  </>
                )}
              </p>
              <div className="flex items-center gap-1">
                <Link
                  href={`https://explorer.testnet.riselabs.xyz/tx/${smartTxResult?.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on explorer"
                >
                  <CopyableAddress
                    address={smartTxResult?.hash || ""}
                    prefix={8}
                    suffix={6}
                    className="underline"
                  />
                </Link>
              </div>
            </div>
            {smartTxResult?.success && (
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span className="text-sm text-success">
                  Transaction confirmed
                </span>
              </div>
            )}
            {smartTxResult?.usedSessionKey && smartTxResult?.keyId && (
              <div className="text-success text-xs mt-1 flex items-center">
                Used key:
                <CopyableAddress
                  address={smartTxResult.keyId}
                  prefix={6}
                  suffix={6}
                  className="text-success ml-1"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
