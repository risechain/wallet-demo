import { useSessionKeyPreference } from "@/context/SessionKeyContext";
import { useSessionKeys } from "@/hooks/useSessionKeys";

export type HeaderProps = {
  label: string;
};

export function TransactionHeader(props: Readonly<HeaderProps>) {
  const { label } = props;

  const { preferSessionKey } = useSessionKeyPreference();
  const { getUsableSessionKey } = useSessionKeys();

  const usableSessionKey = getUsableSessionKey();

  return (
    <div className="flex gap-2 justify-between items-center">
      <p className="text-xl">{label}</p>
      <p className="text-sm font-normal">
        {preferSessionKey && usableSessionKey && (
          <span className="text-success">Session key ready</span>
        )}
        {preferSessionKey && !usableSessionKey && (
          <span className="text-destructive">No session key available!</span>
        )}
        {!preferSessionKey && !usableSessionKey && (
          <span className="text-destructive">Session key deactivated!</span>
        )}
      </p>
    </div>
  );
}
