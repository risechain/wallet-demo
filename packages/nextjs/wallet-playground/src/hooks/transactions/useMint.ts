export type MintProps = {
  token: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  };
};

export function useMint(props: MintProps) {}
