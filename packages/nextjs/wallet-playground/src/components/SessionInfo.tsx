"use client";

import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";
import { Separator } from "@ui/separator";
import { Switch } from "@ui/switch";
import { useAccount } from "wagmi";

import pluralize from "pluralize-esm";
import Link from "next/link";

export function SessionInfo() {
  const { preferSessionKey, setPreferSessionKey } = useSessionKeyPreference();
  const { sessionKeys, hasSessionKey } = useSessionKeys();
  const { isConnected } = useAccount();

  // Get current key state - this will update when hasSessionKey changes
  const hasActiveKey = hasSessionKey();
  // Only count keys that are both active AND have local private keys (usable keys)
  const activeKeys = sessionKeys.filter(
    (key) => key.hasPrivateKey && key.expiry > Math.floor(Date.now() / 1000)
  ).length;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {activeKeys > 0 ? (
            <>
              <span className="font-bold">{activeKeys}</span> active{" "}
              {pluralize("key", activeKeys)}
            </>
          ) : (
            "No active session keys"
          )}
        </p>
      </div>
      <Separator orientation="vertical" className="min-h-6" />

      {isConnected && hasActiveKey && (
        <div className="flex items-center gap-6 justify-between">
          <span className="text-sm ">Use session keys</span>
          <Switch
            disabled={activeKeys === 0}
            checked={preferSessionKey}
            onCheckedChange={setPreferSessionKey}
          />
        </div>
      )}

      {!hasActiveKey && isConnected && (
        <Link href="/session-keys" className="text-sm underline">
          Create a session key!
        </Link>
      )}

      {!isConnected && <p className="text-sm ">Connect your wallet!</p>}
    </div>
  );
}
