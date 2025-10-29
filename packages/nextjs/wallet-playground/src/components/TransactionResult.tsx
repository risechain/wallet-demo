import { Check, Key, Lock } from "lucide-react";
import Link from "next/link";
import { CopyableAddress } from "./CopyableAddress";

export type ResultProps = {
  isSuccess: boolean;
  isSessionKey: boolean;
  transactionHash?: string;
  transactionAddr?: string;
  keyId?: string;
  errorMessage?: string;
  isError?: boolean;
  isWarning?: boolean;
  warningMessage?: string;
};

export function TransactionResult(props: Readonly<ResultProps>) {
  const {
    isSuccess,
    isSessionKey,
    transactionHash,
    errorMessage,
    isWarning,
    warningMessage,
    keyId,
  } = props;

  return (
    <>
      {/* Approval Warning */}
      {isWarning && (
        <div className="p-3 bg-warning/5 rounded-lg">
          <p className="text-sm text-warning">{warningMessage}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-success/5 rounded-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="flex items-center gap-2 text-sm text-success">
              {isSessionKey ? (
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
            {transactionHash && (
              <div className="flex items-center gap-1">
                <Link
                  href={`https://explorer.testnet.riselabs.xyz/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on explorer"
                >
                  <CopyableAddress
                    address={transactionHash || ""}
                    prefix={8}
                    suffix={6}
                    className="underline"
                  />
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Check size={16} />
            <span className="text-sm text-success">Transaction confirmed</span>
          </div>

          {/* {isSessionKey && transactionHash && (
            <div className="text-green-400 text-xs mt-1 flex items-center">
              Used key:
              <CopyableAddress
                address={keyId}
                prefix={6}
                suffix={6}
                className="text-success ml-1"
              />
            </div>
          )} */}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-destructive/5 rounded-md max-w-xl break-all max-h-72 overflow-auto">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}
    </>
  );
}
