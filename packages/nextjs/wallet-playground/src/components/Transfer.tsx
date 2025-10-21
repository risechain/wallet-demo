"use client";

import { MintableERC20ABI } from "@/abi/erc20";
import { TOKENS } from "@/config/tokens";
import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";
import {
  executeTransaction,
  extractContractAddresses,
  TransactionCall,
} from "@/utils/sessionKeyTransactions";
import { Check, ChevronDown, Key, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  encodeFunctionData,
  formatUnits,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import { useAccount, useBalance } from "wagmi";
import { CopyableAddress } from "./CopyableAddress";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

type TokenSymbol = keyof typeof TOKENS;

export function Transfer() {
  const { address, isConnected, connector } = useAccount();

  const { hasSessionKey, executeWithSessionKey, getUsableSessionKey } =
    useSessionKeys();
  const { preferSessionKey } = useSessionKeyPreference();

  // Get current key state - this will update when hasSessionKey changes
  const keyExists = hasSessionKey();
  const usableSessionKey = getUsableSessionKey();

  const [mounted, setMounted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol | "ETH">(
    "MockUSD"
  );
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    hash?: string;
    success: boolean;
    usedSessionKey?: boolean;
    keyId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isETH = selectedToken === "ETH";
  const token = isETH ? null : TOKENS[selectedToken];

  // Get balance
  const { data: balance } = useBalance({
    address,
    token: token?.address,
  });

  // Reset form after successful transfer
  useEffect(() => {
    if (transferResult?.success) {
      setRecipient("");
      setAmount("");
      setError("");
    }
  }, [transferResult?.success]);

  // Smart transfer function that uses session keys when available
  const handleSmartTransfer = async () => {
    setError("");
    setTransferResult(null);

    if (!isAddress(recipient)) {
      setError("Invalid recipient address");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Invalid amount");
      return;
    }

    if (!connector) {
      setError("Wallet connector not available");
      return;
    }

    setIsTransferring(true);

    try {
      let calls: TransactionCall[] = [];

      if (isETH) {
        const value = parseEther(amount);
        if (balance && value > balance.value) {
          setError("Insufficient balance");
          setIsTransferring(false);
          return;
        }

        calls = [
          {
            to: recipient,
            value: value.toString(),
            data: "0x",
          },
        ];
      } else if (token) {
        const parsedAmount = parseUnits(amount, token.decimals);
        if (balance && parsedAmount > balance.value) {
          setError("Insufficient balance");
          setIsTransferring(false);
          return;
        }

        const transferData = encodeFunctionData({
          abi: MintableERC20ABI,
          functionName: "transfer",
          args: [recipient, parsedAmount],
        });

        calls = [
          {
            to: token.address,
            data: transferData,
            value: "0x0",
          },
        ];
      }

      const result = await executeTransaction(
        calls,
        {
          preferSessionKey,
          requiredPermissions: {
            calls: extractContractAddresses(calls),
          },
        },
        connector,
        executeWithSessionKey,
        keyExists,
        usableSessionKey
      );

      if (result.success) {
        setTransferResult(result);
      } else {
        setError(result.error || "Transfer failed");
      }
    } catch (err: any) {
      console.error("Smart transfer error:", err);
      setError(err.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const transferHash = transferResult?.hash;
  const transferSuccess = transferResult?.success;

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-2 justify-between items-center">
          <p className="text-xl">Transfer</p>
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
        {/* Token Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex items-center justify-between text-base"
              size="xl"
            >
              {selectedToken}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            {Object.entries(TOKENS).map(([symbol, tokenInfo]) => (
              <DropdownMenuItem
                key={symbol}
                data-active={tokenInfo.symbol === selectedToken}
                onSelect={() => {
                  setSelectedToken(tokenInfo.symbol);
                  setError("");
                }}
              >
                {tokenInfo.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="border rounded-md py-2 px-4 flex gap-2 justify-between items-center">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-sm text-muted-foreground">
            {balance
              ? `${Number.parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)}`
              : "0.00"}{" "}
            <span className="font-semibold">{selectedToken}</span>
          </p>
        </div>

        <div className="bg-secondary/50 p-4 rounded-lg space-y-1">
          <p className="text-sm font-semibold">Recipient Address</p>
          <Input
            type="text"
            placeholder="0x..."
            className="rounded-lg bg-background"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setError("");
            }}
          />
        </div>

        <div className="bg-secondary/50 p-4 rounded-lg space-y-1">
          <p className="text-sm font-semibold">Amount</p>
          <Input
            type="number"
            placeholder="0.0"
            className="rounded-lg bg-background"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
          />
        </div>

        {/* Transfer Button */}
        <Button
          onClick={handleSmartTransfer}
          disabled={
            isTransferring ||
            !recipient ||
            !amount ||
            Number.parseFloat(amount) <= 0
          }
          className="w-full text-lg"
          size="xl"
        >
          {isTransferring ? <Spinner className="stroke-invert" /> : "Transfer"}
        </Button>

        {/* Transaction Success Message */}
        {transferHash && transferSuccess && (
          <div className="p-3 bg-success/5 rounded-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="flex items-center gap-2 text-sm text-success">
                {transferResult?.usedSessionKey ? (
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
                  href={`https://explorer.testnet.riselabs.xyz/tx/${transferHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on explorer"
                >
                  <CopyableAddress
                    address={transferHash || ""}
                    prefix={8}
                    suffix={6}
                    className="underline"
                  />
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Check size={16} />
              <span className="text-sm text-success">
                Transaction confirmed
              </span>
            </div>

            {transferResult?.usedSessionKey && transferResult?.keyId && (
              <div className="text-green-400 text-xs mt-1 flex items-center">
                Used key:
                <CopyableAddress
                  address={transferResult.keyId}
                  prefix={6}
                  suffix={6}
                  className="text-success ml-1"
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/5 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {transferResult?.error && (
          <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
            Transfer failed: {transferResult.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
