"use client";

import { TOKENS, UNISWAP_CONTRACTS } from "@/config/tokens";
import { Hex, P256, PublicKey, Signature, Value } from "ox";
import { Hooks } from "porto/wagmi";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

export interface SessionKey {
  id: string;
  publicKey: string;
  type: string;
  expiry: number;
  permissions?: {
    calls?: Array<{ to?: string; signature?: string }>;
    spend?: Array<{ limit: string; period: string; token?: string }>;
  };
  hasPrivateKey?: boolean;
}

// Simple module-level storage like Porto playground
let keyPair: {
  publicKey: string;
  privateKey: string;
} | null = null;

export function useSessionKeys() {
  const { address, isConnected, connector } = useAccount();

  // Use Porto's built-in hooks - much simpler!
  const { data: permissions, isLoading: loading } = Hooks.usePermissions();
  const grantPermissions = Hooks.useGrantPermissions();
  const revokePermissions = Hooks.useRevokePermissions();

  const [isCreating, setIsCreating] = useState(false);

  // Check if we have private key locally for a given public key
  const hasLocalPrivateKey = (publicKey: string): boolean => {
    if (typeof window === "undefined") return false;

    try {
      const keyData = localStorage.getItem(`porto.sessionKey.${publicKey}`);
      if (keyData) {
        const parsed = JSON.parse(keyData);
        return !!(parsed.publicKey && parsed.privateKey);
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  };

  // Transform permissions to our SessionKey format
  const sessionKeys: SessionKey[] =
    permissions
      ?.map((permission: any, index: number) => ({
        id: permission.id || `key-${index}`,
        publicKey: permission.key?.publicKey || "",
        type: permission.key?.type || "p256",
        expiry: permission.expiry || 0,
        permissions: {
          calls: permission.permissions?.calls?.map((call: any) => ({
            to: call.to,
            signature: call.signature,
          })),
          spend: permission.permissions?.spend?.map((spend: any) => ({
            limit: spend.limit?.toString(),
            period: spend.period,
            token: spend.token,
          })),
        },
        hasPrivateKey: permission.key?.publicKey
          ? hasLocalPrivateKey(permission.key.publicKey)
          : false,
      }))
      .filter((key: SessionKey) => {
        // Filter to active (non-expired) keys
        const now = Math.floor(Date.now() / 1000);
        return key.expiry > now && key.publicKey;
      })
      .sort((a, b) => {
        // Sort: Active (Local) keys first, then Active (Remote) keys
        if (a.hasPrivateKey && !b.hasPrivateKey) return -1;
        if (!a.hasPrivateKey && b.hasPrivateKey) return 1;
        // If both same type, sort by expiry (most recent first)
        return b.expiry - a.expiry;
      }) || [];

  // Initialize keyPair from localStorage and sync with active session keys
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If we already have a keyPair and it matches an active session key, keep it
    if (
      keyPair &&
      sessionKeys.some(
        (key) =>
          key.publicKey === keyPair.publicKey &&
          key.hasPrivateKey &&
          key.expiry > Math.floor(Date.now() / 1000)
      )
    ) {
      return;
    }

    // Try to restore/update keyPair from localStorage based on active session keys
    const localStorageKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith("porto.sessionKey.")
    );

    // Find the best keyPair: one that matches an active session key
    let bestKeyPair = null;
    for (const storageKey of localStorageKeys) {
      try {
        const keyData = localStorage.getItem(storageKey);
        if (keyData) {
          const parsed = JSON.parse(keyData);
          if (parsed.publicKey && parsed.privateKey) {
            // Check if this key matches an active session key
            const matchingSessionKey = sessionKeys.find(
              (key) =>
                key.publicKey === parsed.publicKey &&
                key.hasPrivateKey &&
                key.expiry > Math.floor(Date.now() / 1000)
            );

            if (matchingSessionKey) {
              bestKeyPair = {
                privateKey: parsed.privateKey,
                publicKey: parsed.publicKey,
              };
              break; // Use the first active key found
            }
          }
        }
      } catch (e) {
        // Ignore invalid entries
      }
    }

    if (
      bestKeyPair &&
      (!keyPair || keyPair.publicKey !== bestKeyPair.publicKey)
    ) {
      keyPair = bestKeyPair;
    }
  }, [sessionKeys]); // Re-run when sessionKeys change

  const createSessionKey = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    setIsCreating(true);
    try {
      // Generate key pair like playground
      const privateKey = P256.randomPrivateKey();
      const publicKey = PublicKey.toHex(P256.getPublicKey({ privateKey }), {
        includePrefix: false,
      });

      // Store in module variable like playground
      keyPair = { privateKey, publicKey };

      // Also store in localStorage so we can flag it later
      localStorage.setItem(
        `porto.sessionKey.${publicKey}`,
        JSON.stringify({ privateKey, publicKey })
      );

      // Simple permissions structure like playground
      const permissionParams = {
        key: { publicKey, type: "p256" as const },
        expiry: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        feeToken: {
          limit: "1.0",
          symbol: "EXP",
        },
        permissions: {
          calls: [
            { to: TOKENS.MockUSD.address },
            { to: TOKENS.MockToken.address },
            { to: UNISWAP_CONTRACTS.router },
          ],
          spend: [
            {
              limit: Value.fromEther("50"),
              period: "minute" as const,
              token: TOKENS.MockUSD.address,
            },
          ],
        },
      };

      // Use Porto's hook instead of manual provider call
      const result = await grantPermissions.mutateAsync(permissionParams);
      // Session key created successfully
      return result;
    } catch (error) {
      console.error("Failed to create session key:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [isConnected, address, grantPermissions]);

  const executeWithSessionKey = useCallback(
    async (calls: Array<{ to: string; data?: string; value?: string }>) => {
      if (!keyPair) {
        throw new Error("create key first.");
      }

      // Use the connector from the hook state
      if (!connector) throw new Error("No connector available");

      const provider = (await connector.getProvider()) as any;
      const chainId = Hex.toNumber(
        await provider.request({ method: "eth_chainId" })
      );

      // Prepare calls like playground
      const { digest, ...request } = await provider.request({
        method: "wallet_prepareCalls",
        params: [
          {
            calls,
            chainId: Hex.fromNumber(chainId),
            key: {
              publicKey: keyPair.publicKey,
              type: "p256",
            },
          },
        ],
      });

      // Sign like playground
      const signature = Signature.toHex(
        P256.sign({
          payload: digest as `0x${string}`,
          privateKey: keyPair.privateKey,
        })
      );

      // Send like playground
      const [{ id: hash }] = await provider.request({
        method: "wallet_sendPreparedCalls",
        params: [
          {
            ...request,
            signature,
          },
        ],
      });

      return { success: true, hash, usedSessionKey: true };
    },
    [connector]
  );

  // Check if we have a USABLE session key (both local private key AND active permission)
  const hasSessionKey = useCallback(() => {
    if (!keyPair) return false;
    if (loading) return false;

    // Must have an active permission that matches our local key
    return sessionKeys.some(
      (key) =>
        key.publicKey === keyPair.publicKey &&
        key.hasPrivateKey === true &&
        key.expiry > Math.floor(Date.now() / 1000)
    );
  }, [sessionKeys, loading]);

  // Get the active session key that can be used for transactions
  const getUsableSessionKey = useCallback(() => {
    if (!keyPair) return null;
    if (loading) return null;

    return (
      sessionKeys.find(
        (key) =>
          key.publicKey === keyPair.publicKey &&
          key.hasPrivateKey === true &&
          key.expiry > Math.floor(Date.now() / 1000)
      ) || null
    );
  }, [sessionKeys, loading]);

  const revokeSessionKey = useCallback(
    async (keyId: string) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      if (!keyId) {
        throw new Error("Key ID is required for revocation");
      }

      try {
        // Find the key being revoked
        const keyToRevoke = sessionKeys.find((key) => key.id === keyId);
        if (!keyToRevoke) {
          throw new Error("Session key not found");
        }

        // Use Porto's hook instead of manual provider call - NO manual refresh needed!
        await revokePermissions.mutateAsync({ id: keyId as `0x${string}` });
        // Session key revoked successfully

        // If we have the private key locally, clear it
        if (keyToRevoke.hasPrivateKey) {
          // Clear module keyPair if it matches
          if (keyPair && keyPair.publicKey === keyToRevoke.publicKey) {
            keyPair = null;
          }

          // Remove from localStorage
          if (typeof window !== "undefined") {
            localStorage.removeItem(
              `porto.sessionKey.${keyToRevoke.publicKey}`
            );
          }
        }

        // NO setTimeout needed - Porto hooks handle state updates automatically!
      } catch (error) {
        console.error("❌ Failed to revoke session key:", error);
        throw error;
      }
    },
    [isConnected, address, sessionKeys, revokePermissions]
  );

  // Only count keys that are both active AND have local private keys (usable keys)
  const activeKeys = sessionKeys.filter(
    (key) => key.hasPrivateKey && key.expiry > Math.floor(Date.now() / 1000)
  ).length;

  return {
    sessionKeys,
    activeKeys,
    createSessionKey,
    executeWithSessionKey,
    hasSessionKey,
    getUsableSessionKey,
    revokeSessionKey,
    isCreating,
    loading,
    error: null, // Porto hooks handle errors internally
  };
}
