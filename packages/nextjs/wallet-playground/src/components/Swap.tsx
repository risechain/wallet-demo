"use client";

import { UniswapV2RouterABI } from "@/abi/swap";
import { TOKENS, UNISWAP_CONTRACTS } from "@/config/tokens";
import { useSwap } from "@/hooks/useSwap";
import { ArrowDownUp } from "lucide-react";
import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { TransactionHeader } from "./TransactionHeader";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

type TokenSymbol = keyof typeof TOKENS;

export function Swap() {
  const { address } = useAccount();

  const {
    onSwap,
    isPending: isSwapping,
    data: result,
    errorMessage,
    isSuccess,
    reset,
  } = useSwap();

  const [fromToken, setFromToken] = useState<TokenSymbol>("MockUSD");
  const [toToken, setToToken] = useState<TokenSymbol>("MockToken");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [error, setError] = useState("");

  const fromConfig = TOKENS[fromToken];
  const toConfig = TOKENS[toToken];

  // Get balances
  const { data: fromBalance, refetch: refetchFromBalance } = useBalance({
    address,
    token: fromConfig.address,
    query: { refetchInterval: 10000 },
  });

  const { data: toBalance, refetch: refetchToBalance } = useBalance({
    address,
    token: toConfig.address,
    query: { refetchInterval: 10000 },
  });

  // Parse amount for quote
  const amountInBigInt = (() => {
    try {
      if (!fromAmount || fromAmount.trim() === "") return undefined;
      const numAmount = Number.parseFloat(fromAmount);
      if (Number.isNaN(numAmount) || numAmount <= 0) return undefined;
      return parseUnits(fromAmount, fromConfig.decimals);
    } catch (error) {
      console.log("❌ Amount parsing error:", error);
      return undefined;
    }
  })();

  const contractArgs =
    amountInBigInt && fromToken !== toToken
      ? [amountInBigInt, [fromConfig.address, toConfig.address]]
      : undefined;

  // Get quote
  const {
    data: quoteData,
    isLoading: quoteLoading,
    error: quoteError,
    isError: quoteIsError,
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
        const outputAmount = formatUnits(quoteData[1], toConfig.decimals);
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
    toConfig.decimals,
  ]);

  const handleSwap = async () => {
    reset(); // TODO debounce this

    const amountIn = parseUnits(fromAmount, fromConfig.decimals);
    const estimatedAmountOut = Number.parseFloat(toAmount);
    const minAmountOut = estimatedAmountOut * 0.8; // 20% slippage
    const amountOutMin = parseUnits(minAmountOut.toString(), toConfig.decimals);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes

    // TODO: Add no quote available check
    if (fromBalance && amountIn > fromBalance.value) {
      setError("Insufficient balance");
      return;
    }

    const response = await onSwap({
      accountAddress: address,
      amountIn,
      amountOutMin,
      fromAddress: fromConfig.address,
      toAddress: toConfig.address,
      deadline,
    });

    if (response.success) {
      refetchToBalance();
      refetchFromBalance();
    }
  };

  const handleTokenSwitch = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
    setToAmount("");
    setError("");
  };

  const handleMaxClick = () => {
    if (fromBalance) {
      const maxAmount = formatUnits(fromBalance.value, fromBalance.decimals);
      setFromAmount(maxAmount);
    }
  };

  const isDisabled = !fromAmount || !toAmount || !!error;

  return (
    <Card>
      <CardHeader>
        <TransactionHeader label="Swap" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* From Section */}
        <div className="bg-secondary/50 p-4 rounded-lg">
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
                  }}
                />
                <p className="text-sm text-muted-foreground font-semibold">
                  {fromConfig.symbol}
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
        <div className="bg-secondary/50 p-4 rounded-lg">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">To</p>
              <span className="text-sm text-muted-foreground">
                Balance:{" "}
                {toBalance
                  ? Number.parseFloat(
                      formatUnits(toBalance?.value ?? 0n, toBalance.decimals)
                    ).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center gap-1 border rounded-lg pr-3 bg-background">
              <Input
                type="text"
                id="to"
                readOnly
                placeholder="0"
                className="border-none"
                value={quoteLoading ? "please wait..." : toAmount}
              />
              <p className="text-sm text-muted-foreground font-semibold">
                {toConfig.symbol}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSwap}
          disabled={isSwapping || isDisabled}
          className="w-full text-lg"
          size="xl"
        >
          {isSwapping ? <Spinner className="stroke-invert" /> : "Swap"}
        </Button>

        <TransactionResult
          isSuccess={isSuccess}
          isSessionKey={result?.usedSessionKey}
          transactionHash={result?.id}
          transactionAddr={result?.id}
          errorMessage={error || errorMessage}
        />
      </CardContent>
    </Card>
  );
}
