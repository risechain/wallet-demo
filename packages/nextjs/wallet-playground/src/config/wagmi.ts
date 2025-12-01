import { Chains, Mode, Dialog } from "rise-wallet";
import { porto } from "rise-wallet/wagmi";
import { createClient, http } from "viem";
import { createConfig } from "wagmi";

// Export the porto connector instance for session key access
export const portoConnector = porto({
  mode: Mode.dialog({
    host: "https://stg.wallet.risechain.com/dialog/",
    renderer: Dialog.popup(), // Use popup mode to bypass iframe restrictions
  }),
  relay: http("https://stg.relay.wallet.risechain.com"),
});

export const config = createConfig({
  chains: [Chains.riseTestnet],
  connectors: [portoConnector],
  transports: {
    [Chains.riseTestnet.id]: http("https://testnet.riselabs.xyz"),
  },
});

export const client = createClient({
  transport: http("https://testnet.riselabs.xyz"),
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
