import { porto } from "porto/wagmi";
import { riseTestnet, riseTestnetConfig } from "rise-wallet";
import { http } from "viem";
import { createConfig } from "wagmi";

// Export the porto connector instance for session key access
export const portoConnector = porto(riseTestnetConfig);

export const config = createConfig({
  chains: [riseTestnet],
  connectors: [portoConnector],
  transports: {
    [riseTestnet.id]: http("https://testnet.riselabs.xyz"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
