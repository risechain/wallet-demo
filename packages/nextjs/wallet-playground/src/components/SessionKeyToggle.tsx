"use client";

import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";
import { Circle } from "lucide-react";
import { useState, useEffect } from "react";
import { Separator } from "@ui/separator";

import pluralize from "pluralize-esm";
import { Switch } from "./ui/switch";
import { isEmpty } from "lodash";

export function SessionKeyToggle() {
  const [mounted, setMounted] = useState(false);
  const { preferSessionKey, setPreferSessionKey } = useSessionKeyPreference();
  const { sessionKeys, hasSessionKey } = useSessionKeys();

  // Get current key state - this will update when hasSessionKey changes
  const hasActiveKey = hasSessionKey();
  // Only count keys that are both active AND have local private keys (usable keys)
  const activeKeys = sessionKeys.filter(
    (key) => key.hasPrivateKey && key.expiry > Math.floor(Date.now() / 1000)
  ).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          <span className="text-sm text-gray-300">Loading...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Use session keys:</span>
          <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-600">
            <span className="inline-block h-3 w-3 transform rounded-full bg-white translate-x-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="w-full border rounded-sm px-4 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {activeKeys > 0
              ? `${activeKeys} active ${pluralize("key", activeKeys)}`
              : "No active session keys"}
          </span>
          <Circle
            data-activekeys={hasActiveKey}
            size={10}
            className="fill-muted-foreground stroke-muted-foreground data-[activekeys=true]:fill-success data-[activekeys=true]:stroke-success"
          />
        </div>
        <Separator />
        <div className="flex items-center gap-2 justify-between">
          <span className="text-sm ">Use session keys:</span>
          <Switch
            disabled={activeKeys === 0}
            checked={preferSessionKey}
            onCheckedChange={setPreferSessionKey}
          />
        </div>
      </div>
    </div>
  );
}
