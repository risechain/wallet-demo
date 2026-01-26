"use client";

import { TOKENS } from "@/config/tokens";
import { useTransfer } from "@/hooks/useTransfer";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { TransactionHeader } from "./TransactionHeader";
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
import { Spinner } from "./ui/spinner";

type TokenSymbol = keyof typeof TOKENS;

export function Transfer() {
  const { address } = useAccount();

  const {
    onTransfer,
    isPending: isTransferring,
    data: result,
    errorMessage,
    isSuccess,
  } = useTransfer();

  const [selectedToken, setSelectedToken] = useState<TokenSymbol | "ETH">(
    "MockUSD",
  );

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const isETH = selectedToken === "ETH";
  const token = isETH ? null : TOKENS[selectedToken];

  // Get balance
  const { data: balance, refetch } = useBalance({
    address,
    token: token?.address,
  });

  const handleTransfer = async () => {
    if (!isAddress(recipient)) {
      setError("Invalid recipient address!");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Invalid amount!");
      return;
    }

    const tokenBalance = formatUnits(balance.value, balance.decimals);

    if (Number.parseFloat(tokenBalance) < Number.parseFloat(amount)) {
      setError("Insufficient Balance!");
      return;
    }

    const parsedAmount = parseUnits(amount, token.decimals);

    const response = await onTransfer({
      address: token.address,
      recipient,
      parsedAmount,
    });

    if (response.success) {
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TransactionHeader label="Transfer" />
      </CardHeader>

      <CardContent className="space-y-4">
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
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
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

        <div className="bg-secondary p-4 rounded-lg space-y-1">
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

        <div className="bg-secondary p-4 rounded-lg space-y-1">
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

        <Button
          onClick={handleTransfer}
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
