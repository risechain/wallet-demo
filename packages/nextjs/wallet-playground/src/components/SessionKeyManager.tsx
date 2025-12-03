"use client";

import { useSessionKeys } from "@/hooks/useSessionKeys";
import { useTransaction } from "@/hooks/useTransaction";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import { Info } from "lucide-react";
import pluralize from "pluralize-esm";
import { useEffect, useState } from "react";
import { CopyableAddress } from "./CopyableAddress";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";

// Helper function to format time remaining
function formatTimeRemaining(expiry: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiry - now;

  if (remaining <= 0) return "Expired";

  const minutes = Math.floor(remaining / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ${pluralize("day", days)}`;
  if (hours > 0) return `${hours} ${pluralize("hour", hours)}`;
  return `${minutes} ${pluralize("minute", minutes)}`;
}

export function SessionKeyManager() {
  const {
    sessionKeys,
    createSessionKey,
    revokeSessionKey,
    isCreating,
    loading,
  } = useSessionKeys();

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const [ethAccounts, setEthAccounts] = useState([]);
  const { getEthAccounts } = useTransaction();

  useEffect(() => {
    const initialize = async () => {
      const accounts = await getEthAccounts();
      if (isEmpty(accounts)) {
        console.log("Disconnected Error - No Accounts:", isEmpty(accounts));
      }
      setEthAccounts(accounts);
    };

    initialize();
  }, []);

  const handleCreateKey = async () => {
    if (ethAccounts.length === 0) {
      setError("Sync Issue: No ETH Accounts found. Reconnect your wallet!");
    }

    try {
      setError("");
      const result = await createSessionKey();
      setResult(result);
    } catch (err: any) {
      // Handle user rejection gracefully
      if (
        err.message?.includes("user rejected") ||
        err.message?.includes("User rejected")
      ) {
        setError("Session key creation was cancelled");
      } else {
        setError(err.message || "Failed to create session key");
      }
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      setError("");
      setRevokingKeyId(keyId);

      await revokeSessionKey(keyId);
      setResult(null);
    } catch (err: any) {
      // Handle user rejection gracefully
      if (
        err.message?.includes("user rejected") ||
        err.message?.includes("User rejected")
      ) {
        setError("Session key revocation was cancelled");
      } else {
        setError(err.message || "Failed to revoke session key");
      }
    } finally {
      setRevokingKeyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>Session Key Management</CardHeader>

      <CardContent className="space-y-4">
        {/* Info Section */}
        <div className="p-4 border rounded-md space-y-2">
          <div className="flex gap-3 items-start">
            <Info size={16} className="mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold">About Session Keys:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="text-inherit">
                  • Enable transactions without biometric confirmation
                </li>
                <li className="text-inherit">
                  • Limited permissions for security
                </li>
                <li className="text-inherit">
                  • Automatically expire after set time
                </li>
                <li className="text-inherit">• Can be revoked at any time</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleCreateKey}
            disabled={isCreating}
            className="w-full text-lg"
            size="xl"
          >
            {isCreating ? (
              <Spinner className="stroke-invert" />
            ) : (
              "Create Session Key"
            )}
          </Button>
          <p className="text-muted-foreground text-sm text-center">
            Session keys enable faster transactions without biometric
            confirmation
          </p>
        </div>
        <Separator />

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-destructive/5 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-success/5 rounded-md">
            <p className="text-sm text-success">
              Session key created successfully!
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 items-center justify-center">
          {sessionKeys.length === 0 && !loading && (
            <div className="flex flex-col gap-2 items-center justify-center border rounded-md p-4 w-full">
              <p className="text-muted-foreground text-sm text-center">
                No active session keys!
              </p>
              <p className="text-sm text-center">
                Create one to enable faster transactions!
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-2 items-center justify-center border rounded-md p-4 w-full">
              <Spinner />
              <p className="text-muted-foreground text-sm text-center">
                Loading session keys, please wait!
              </p>
            </div>
          )}

          {sessionKeys.map((key) => {
            const isExpired = key.expiry <= Math.floor(Date.now() / 1000);
            const timeRemaining = formatTimeRemaining(key.expiry);

            return (
              <div
                key={key.id}
                className={cn(
                  "p-6 border rounded-lg w-full bg-warning/2 border-warning/25",
                  isExpired && "bg-secondary/50 border-secondary/75",
                  key.hasPrivateKey && "bg-primary/2 border-primary/25"
                )}
              >
                {/* Key Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full bg-warning",
                        isExpired && "bg-secondary",
                        key.hasPrivateKey && "bg-success"
                      )}
                    />
                    <span className="font-semibold">Session Key</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm px-4 py-1 rounded-full bg-warning text-invert",
                      isExpired && "bg-secondary text-foreground",
                      key.hasPrivateKey && "bg-success"
                    )}
                  >
                    {isExpired && "Expired"}
                    {!isExpired && !key.hasPrivateKey && "Active (Remote)"}
                    {!isExpired && key.hasPrivateKey && "Active (Local)"}
                  </span>
                </div>

                {/* Key Details */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className={cn(isExpired && "text-destructive")}>
                      {timeRemaining}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="">{key.type}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Public Key:</span>
                    <CopyableAddress
                      address={key.publicKey}
                      prefix={10}
                      suffix={10}
                    />
                  </div>

                  {!key.hasPrivateKey && (
                    <div className="text-warning text-sm p-2 border border-warning rounded-md my-4">
                      ⚠️ Private key not available locally - cannot use for
                      transactions
                    </div>
                  )}
                </div>

                <Separator className="my-4" />
                {/* Permissions */}
                {key.permissions?.calls && key.permissions.calls.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Allowed Contracts:
                    </div>
                    <div className="space-y-2 pt-4">
                      {key.permissions.calls.map((call, idx) => {
                        return (
                          <div
                            key={`${call.signature}-${call.to}`}
                            className="text-xs text-gray-300 flex items-center"
                          >
                            •{" "}
                            {call.to ? (
                              <div className="flex gap-2 items-center w-full justify-between">
                                <CopyableAddress
                                  address={call.to}
                                  prefix={6}
                                  suffix={4}
                                  className="text-gray-300 ml-1"
                                />
                                <p>{call.signature}</p>
                              </div>
                            ) : (
                              "Any contract"
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />
                {key.permissions?.spend && key.permissions.spend.length > 0 && (
                  <div className="flex gap-2 justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Spend Limits:
                    </p>
                    {key.permissions.spend.map((spend, idx) => (
                      <div key={idx} className="text-sm">
                        {spend.limit
                          ? `${Number.parseInt(spend.limit) / 1e18} tokens`
                          : "No limit"}{" "}
                        per {spend.period || "hour"}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {!isExpired && (
                  <Button
                    variant="destructive"
                    onClick={() => handleRevokeKey(key.id)}
                    disabled={revokingKeyId === key.id}
                    className="w-full"
                  >
                    {revokingKeyId === key.id ? (
                      <Spinner className="stroke-invert" />
                    ) : (
                      "Revoke Key"
                    )}
                  </Button>
                )}
              </div>
            );
          })}

          {/* TODO: Add refetch keys here */}
        </div>
      </CardContent>
    </Card>
  );
}
