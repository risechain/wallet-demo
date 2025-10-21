import { useUserPreference } from "@/context/UserPreference";
import { Hex } from "viem";
import { useSendCalls } from "wagmi";
import { useSessionKeys } from "./useSessionKeys";

export type TransactionCall = {
  to: Hex;
  data?: Hex;
  value?: bigint;
};

export type TransactionProps = {
  calls: TransactionCall[];
  requiredPermissions?: {
    calls?: string[];
  };
};

export type TransactionData = {
  hash: string;
  success: boolean;
  usedSessionKey?: boolean;
  keyId?: string;
};

export function useTransaction() {
  const { executeWithSessionKey, activeSessionKeys, hasUsableSessionKey } =
    useSessionKeys();

  const { isSessionKeyEnabled } = useUserPreference();

  const { sendCallsAsync } = useSendCalls();

  async function execute(props: TransactionProps) {
    console.log("executing...");
    const { calls, requiredPermissions } = props;

    if (isSessionKeyEnabled && activeSessionKeys && hasUsableSessionKey) {
      const callAddresses = requiredPermissions.calls.map((addr) =>
        addr.toLowerCase()
      );

      const permissions = activeSessionKeys.permissions?.calls || [];

      const isPermitted = callAddresses.every((requiredAddress) =>
        permissions.some(
          (perm: any) => !perm.to || perm.to.toLowerCase() === requiredAddress
        )
      );

      try {
        if (isPermitted) {
          // Session key lacks required permissions, fall back to passkey
          const result = await executeWithSessionKey(calls);

          return {
            success: true,
            error: null,
            data: { ...result, keyId: activeSessionKeys.id },
          };
        } else {
          return executeWithPasskey(calls);
        }
      } catch (error) {
        console.log("Execute-Error: ", error);
        return {
          success: false,
          error,
          data: null,
        };
      }
    } else {
      return executeWithPasskey(calls);
    }
  }

  async function executeWithPasskey(calls: TransactionCall[]) {
    try {
      // TODO: Fix type instantation issue - wagmi
      const result = await sendCallsAsync({
        calls,
        version: "1",
      } as any);

      return {
        success: true,
        error: null,
        data: { ...result, usedSessionKey: false },
      };
    } catch (error) {
      console.log("Execute-Passkey-Error: ", error);

      return {
        success: false,
        error,
        data: null,
      };
    }
  }

  return {
    execute,
    executeWithPasskey,
  };
}
