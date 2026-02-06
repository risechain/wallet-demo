"use client";

import { BRIDGE_TOKENS, Chain, SupportedChains } from "@/config/tokens";
import { useBridge } from "@/hooks/useBridge";
import { useMinimumDeposit } from "@/hooks/useMinimumDeposit";
import { useWalletAsset } from "@/hooks/useWalletAsset";
import { ChevronDown, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Value } from "ox";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { riseTestnet } from "viem/chains";
import { useAccount } from "wagmi";
import { TransactionResult } from "./TransactionResult";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

export function Bridge() {
  const { address } = useAccount();

  const {
    onBridge,
    isPending: isBridging,
    data: result,
    errorMessage,
    isSuccess,
    reset,
  } = useBridge();

  const [selectedChain, setSelectedChain] = useState<Chain>(SupportedChains[0]);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  // Get available tokens for selected chain
  const availableTokens = useMemo(() => {
    return BRIDGE_TOKENS[selectedChain.id] || [];
  }, [selectedChain]);

  // Set default token when chain changes
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedTokenSymbol) {
      setSelectedTokenSymbol(availableTokens[0].symbol);
    }
  }, [availableTokens, selectedTokenSymbol]);

  const selectedToken = useMemo(() => {
    return availableTokens.find((t) => t.symbol === selectedTokenSymbol);
  }, [availableTokens, selectedTokenSymbol]);

  // when selected token is usdc, get rise usdc balance also
  const riseSelectedToken = useMemo(() => {
    const riseTokens = BRIDGE_TOKENS[riseTestnet.id] || [];

    return riseTokens.find((t) => t.symbol === selectedTokenSymbol);
  }, [availableTokens, selectedTokenSymbol]);

  // Get minimum deposit amount
  const { minDepositAmount, isLoadingMinAmounts, isFetchingMinAmounts } =
    useMinimumDeposit({
      selectedToken,
      selectedChainId: selectedChain.id,
    });

  const {
    balance,
    refetch: refetchBalance,
    // isLoading: isWalletAssetLoading,
  } = useWalletAsset({
    address: address ?? "0x",
    chainId: selectedChain?.id,
    tokenAddress: selectedToken?.address ?? "0x",
  });

  const {
    balance: riseTokenBalance,
    // isLoading: isWalletAssetLoading,
  } = useWalletAsset({
    address: address ?? "0x",
    chainId: riseTestnet?.id,
    tokenAddress: riseSelectedToken?.address ?? "0x",
  });

  const amountBalance = useMemo(() => {
    if (balance) {
      return Value.format(balance, selectedToken?.decimals);
    }

    return "0.00";
  }, [balance, selectedToken?.decimals]);

  const riseBalanceFormatted = useMemo(() => {
    return riseTokenBalance ? formatUnits(riseTokenBalance, 18) : "0.00";
  }, [riseTokenBalance]);

  const handleBridge = async () => {
    reset();

    if (!selectedToken) {
      setError("Please select a token");
      return;
    }

    const amountBigInt = parseUnits(amount, selectedToken.decimals);

    // Check balance
    if (amountBigInt > balance) {
      setError("Insufficient balance");
      return;
    }

    // Check minimum deposit using the hook value if available, fallback to config
    const minDeposit = minDepositAmount
      ? parseUnits(minDepositAmount, selectedToken.decimals)
      : selectedToken.minDeposit;

    if (amountBigInt < minDeposit) {
      setError(
        `Minimum deposit is ${minDepositAmount || formatUnits(selectedToken.minDeposit, selectedToken.decimals)} ${selectedToken.symbol}`,
      );
      return;
    }

    const response = await onBridge({
      account: address,
      amount: amountBigInt,
      selectedToken,
    });

    if (response.success) {
      refetchBalance();
      setAmount("");
    }
  };

  const handleMaxClick = () => {
    const maxAmount = formatUnits(balance, selectedToken.decimals);
    setAmount(maxAmount);
  };

  const isDisabled = !amount || !selectedToken || !!error;

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-2 justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-xl">Global Deposit</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px]">
                <p>
                  Need test tokens?{" "}
                  <Link
                    href="/mint"
                    className="underline font-semibold hover:opacity-80"
                  >
                    Mint Tokens
                  </Link>{" "}
                  on Sepolia to test Global Deposit.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm font-normal">Bridge to your RISE Wallet</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* RISE Chain Balances */}
        <div className="bg-secondary p-4 rounded-lg space-y-3">
          <p className="text-sm font-semibold">RISE Wallet Balance</p>
          <div className="flex items-center gap-2 bg-background p-3 rounded-lg">
            <Image
              src={riseSelectedToken?.icon}
              alt="USDC"
              width={20}
              height={20}
            />
            <div className="flex gap-1 items-center">
              <span className="text-sm font-semibold">
                {riseBalanceFormatted}
              </span>
              <span className="text-xs text-muted-foreground">
                {riseSelectedToken?.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Source Chain Selection */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Source Chain</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={selectedChain.icon}
                    alt=""
                    width={20}
                    height={20}
                  />
                  <span>{selectedChain.name}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {SupportedChains.map((chain) => (
                <DropdownMenuItem
                  key={chain.id}
                  data-active={chain.id === selectedChain.id}
                  onClick={() => {
                    setSelectedChain(chain);
                    setSelectedTokenSymbol("");
                    setAmount("");
                    setError("");
                    reset();
                  }}
                >
                  <Image src={chain.icon} alt="" width={20} height={20} />
                  {chain.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Token Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 pr-2">
            <p className="text-sm font-semibold">Token</p>
            <span className="text-sm text-muted-foreground">
              Balance: {amountBalance}{" "}
              <span className="font-bold">{selectedToken?.symbol}</span>
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  {selectedToken?.icon && (
                    <Image
                      src={selectedToken.icon}
                      alt=""
                      width={20}
                      height={20}
                    />
                  )}
                  <span>{selectedToken?.symbol || "Select token"}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {availableTokens.map((token, index) => (
                <div key={token.symbol}>
                  <DropdownMenuItem
                    data-active={token.symbol === selectedTokenSymbol}
                    onClick={() => {
                      setSelectedTokenSymbol(token.symbol);
                      setAmount("");
                      setError("");
                      reset();
                    }}
                  >
                    <Image src={token.icon} alt="" width={20} height={20} />
                    {token.symbol}
                  </DropdownMenuItem>
                  {availableTokens.length - 1 !== index && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Amount Section */}
        <div className="bg-secondary p-4 rounded-lg">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Amount</p>
              {selectedToken && (
                <div className="flex gap-1">
                  <p className="text-sm text-th_base-secondary">
                    Minimum Deposit:
                  </p>
                  {isLoadingMinAmounts || isFetchingMinAmounts ? (
                    <div className="h-4 w-16 animate-pulse rounded bg-th_base" />
                  ) : (
                    <p className="text-sm text-th_base-secondary">
                      <span>
                        {minDepositAmount ??
                          formatUnits(
                            selectedToken?.minDeposit,
                            selectedToken?.decimals,
                          )}{" "}
                      </span>{" "}
                      <span className="font-bold">{selectedToken?.symbol}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex flex-1 gap-2 items-center border rounded-lg pr-3 bg-background">
                <Input
                  type="number"
                  id="amount"
                  placeholder="0"
                  className="border-none"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                    reset();
                  }}
                />
                <p className="text-sm text-muted-foreground font-semibold">
                  {selectedToken?.symbol || "---"}
                </p>
              </div>
              <Button variant="outline" onClick={handleMaxClick}>
                Max
              </Button>
            </div>
          </div>
        </div>

        {/* Deposit Button */}
        <Button
          onClick={handleBridge}
          disabled={isBridging || isDisabled}
          className="w-full text-lg"
          size="xl"
        >
          {isBridging ? (
            <>
              <Spinner className="stroke-invert" />
              Bridging...
            </>
          ) : (
            "Bridge"
          )}
        </Button>

        <TransactionResult
          isSuccess={isSuccess}
          isSessionKey={result?.usedSessionKey}
          transactionHash={result?.id}
          transactionAddr={result?.id}
          errorMessage={error || errorMessage}
          url={`https://testnet.layerzeroscan.com/tx/${result?.id}`}
        />
      </CardContent>
    </Card>
  );
}
