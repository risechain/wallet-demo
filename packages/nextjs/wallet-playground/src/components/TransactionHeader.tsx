import { useUserPreference } from "@/context/UserPreference";
import { useSessionKeys } from "@/hooks/useSessionKeys";

export type HeaderProps = {
  label: string;
};

export function TransactionHeader(props: Readonly<HeaderProps>) {
  const { label } = props;

  const { isSessionKeyEnabled } = useUserPreference();
  const { hasSessionKey: usableSessionKey } = useSessionKeys();

  return (
    <div className="flex gap-2 justify-between items-center">
      <p className="text-xl">{label}</p>
      <p className="text-sm font-normal">
        {isSessionKeyEnabled && usableSessionKey && (
          <span className="text-success">Session key ready!</span>
        )}
        {isSessionKeyEnabled && !usableSessionKey && (
          <span className="text-destructive">No session key available!</span>
        )}
        {!isSessionKeyEnabled && (
          <span className="text-destructive">Session key deactivated!</span>
        )}
      </p>
    </div>
  );
}
