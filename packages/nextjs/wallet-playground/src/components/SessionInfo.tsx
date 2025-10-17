"use client";

import { useSessionKeys } from "@/hooks/useSessionKeys";
import pluralize from "pluralize-esm";

export function SessionInfo() {
  const { activeKeys } = useSessionKeys();

  return (
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
  );
}
