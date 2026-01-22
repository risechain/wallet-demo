import { riseWallet } from "rise-wallet/wagmi";
import { createClient, http } from "viem";
import { riseTestnet, sepolia } from "viem/chains";
import { createConfig } from "wagmi";

// Export the porto connector instance for session key access
export const portoConnector = riseWallet();

export const config = createConfig({
  chains: [riseTestnet, sepolia],
  connectors: [portoConnector],
  transports: {
    [riseTestnet.id]: http("https://testnet.riselabs.xyz"),
    [sepolia.id]: http(),
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
