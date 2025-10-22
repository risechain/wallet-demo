import { useUserPreference } from "@/context/UserPreference";
import { Hex, P256, Signature } from "ox";
import { Address, Hex as HexAddress } from "viem";
import { useAccount, useChainId, useSendCalls } from "wagmi";
import { useSessionKeys } from "./useSessionKeys";

export type TransactionCall = {
  to: HexAddress;
  data?: HexAddress;
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
  const {
    activeSessionKeys: sessionKey,
    hasUsableSessionKey,
    keyPair: key,
  } = useSessionKeys();

  const { isSessionKeyEnabled } = useUserPreference();

  const { connector } = useAccount();
  const chainId = useChainId();

  const { sendCallsAsync } = useSendCalls();

  async function execute(props: TransactionProps) {
    console.log("executing...");
    const { calls, requiredPermissions } = props;

    if (isSessionKeyEnabled && sessionKey && hasUsableSessionKey) {
      console.log("activeSessionKeys:: ", sessionKey);
      const callAddresses = requiredPermissions.calls.map((addr) =>
        addr.toLowerCase()
      );

      const permissions = sessionKey.permissions?.calls || [];

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
            error: null,
            ...result,
          };
        } else {
          return executeWithPasskey(calls);
        }
      } catch (error) {
        console.log("execute-error: ", error);
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
    console.log("executing using passkey....");
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
      console.log("execute-with-passkey-error: ", error);

      return {
        success: false,
        error,
        data: null,
      };
    }
  }

  async function executeWithSessionKey(calls: TransactionCall[]) {
    console.log("executing using sessionkey....");
    try {
      const provider = (await connector.getProvider()) as any;

      // Prepare calls
      const { digest, ...request } = await provider.request({
        method: "wallet_prepareCalls",
        params: [
          {
            calls,
            chainId: Hex.fromNumber(chainId),
            key: {
              publicKey: key.publicKey,
              type: "p256",
            },
          },
        ],
      });

      // Sign the call
      const signature = Signature.toHex(
        P256.sign({
          payload: digest as `0x${string}`,
          privateKey: key.privateKey as Address,
        })
      );

      // Send like playground
      const result = await provider.request({
        method: "wallet_sendPreparedCalls",
        params: [
          {
            ...request,
            signature,
          },
        ],
      });

      console.log("session-result:: ", result);
      console.log("session-signature:: ", signature);
      console.log("session-digest:: ", digest);
      console.log("session-key:: ", key);

      return {
        success: true,
        error: null,
        data: { ...result, usedSessionKey: true },
      };
    } catch (error) {
      console.log("execute-with-sessionkey-error:: ", error);
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
    executeWithSessionKey,
  };
}
