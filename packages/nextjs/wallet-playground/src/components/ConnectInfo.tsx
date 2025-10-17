import { useConnect } from "wagmi";
import { Button } from "./ui/button";

export type ConnectInfoProps = {
  label: string;
};

export function ConnectInfo({ label }: Readonly<ConnectInfoProps>) {
  const { connect, isPending, connectors } = useConnect();

  const portoConnector = connectors.find((c) => c.id === "xyz.ithaca.porto");

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <p className="text-muted-foreground">
        Login your wallet to <span className="font-bold">{label}</span>!
      </p>

      <Button
        onClick={() => connect({ connector: portoConnector })}
        disabled={isPending}
        className="min-w-40"
      >
        {isPending ? "Connecting..." : "Connect via Passkey"}
      </Button>
    </div>
  );
}
