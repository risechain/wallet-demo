import { createConfig } from "wagmi";
import { porto } from "porto/wagmi";
import { http } from "viem";
import { riseTestnet, riseTestnetConfig } from "rise-wallet";

// Export the porto connector instance for session key access
export const portoConnector = porto(riseTestnetConfig);

export const config = createConfig({
  chains: [riseTestnet],
  connectors: [portoConnector],
  transports: {
    [riseTestnet.id]: http("https://testnet.riselabs.xyz"),
  },
});
