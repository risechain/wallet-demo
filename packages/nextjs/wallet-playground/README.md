# RISE Wallet Playground

A minimal wallet interface for testing on RISE testnet, featuring token transfers, minting, and swapping functionality.

## Features

- **Connect Wallet** - Connect to RISE testnet (Chain ID: 11155931)
- **Transfer Widget** - Send ETH and ERC-20 tokens with balance validation
- **Token Minting** - Mint 1000 test tokens (MockA/MockB) once per address
- **Swap Widget** - Token swapping interface (MockA ↔ MockB)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in terminal)

## Network Configuration

### RISE Testnet Parameters
- **Network Name**: RISE Testnet
- **Chain ID**: 11155931
- **Currency Symbol**: ETH
- **RPC URL**: https://testnet.riselabs.xyz
- **WebSocket URL**: wss://testnet.riselabs.xyz/ws
- **Block Explorer**: https://explorer.testnet.riselabs.xyz

### Contract Addresses
- **MockA Token**: `0xC23b6B892c947746984474d52BBDF4ADd25717B3` (6 decimals)
- **MockB Token**: `0x7C4B1b2953Fd3bB0A4aC07da70b0839d1D09c2cA` (8 decimals)
- **UniswapV2 Factory**: `0xB506E780805a945e13691560ADf90421A1c6f03b`
- **UniswapV2 Router**: `0x9a5Ae52Cfb54a589FbF602191358a293C1681173`
- **MockA/MockB Pair**: `0x467E62403E5668F7aB8fcC26a6A46639cBCf0969`

## Usage

### 1. Connect Wallet
- Click "Connect Wallet" in the header
- Select your preferred wallet (MetaMask, WalletConnect, etc.)
- Add RISE testnet to your wallet if not already configured

### 2. Get Test Tokens
- Use the Transfer Widget to mint test tokens
- Each address can mint 1000 tokens once per token type
- You'll see a green "Mint" button when you have 0 balance and haven't minted yet

### 3. Transfer Tokens
- Select token type (ETH, MockA, or MockB)
- Enter recipient address and amount
- Click "Send" to transfer

### 4. Swap Tokens
- Use the Swap Widget to exchange MockA and MockB tokens
- Set slippage tolerance in settings
- Note: OnChainKit may have limited RISE testnet support

## Environment Variables

Create a `.env.local` file for optional configuration:

```bash
# OnChainKit API Key (optional, for enhanced functionality)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here

# WalletConnect Project ID (optional, for WalletConnect support)
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id_here
```

## Technology Stack

- **Next.js 15** - React framework
- **Wagmi 2** - React hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum
- **OnChainKit** - Coinbase's web3 components
- **TailwindCSS** - Utility-first CSS framework
- **TypeScript** - Type safety

## Project Structure

```
src/
├── components/
│   ├── ConnectButton.tsx    # Wallet connection component
│   ├── TransferWidget.tsx   # Token transfer with mint functionality
│   └── SwapWidget.tsx       # Token swapping interface
├── config/
│   ├── chains.ts           # RISE testnet configuration
│   ├── tokens.ts           # Token contracts and ABI
│   └── wagmi.ts            # Wagmi configuration
├── providers/
│   ├── AppProvider.tsx     # OnChainKit provider
│   └── WalletProvider.tsx  # Wagmi + TanStack Query provider
└── app/
    ├── layout.tsx          # Root layout with providers
    ├── page.tsx            # Main application page
    └── globals.css         # Global styles
```

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server

### Adding New Features

The application is designed to be minimal and extensible. To add new features:

1. Create components in `src/components/`
2. Add contract configurations to `src/config/tokens.ts`
3. Update the main page layout in `src/app/page.tsx`

## Contributing

This is a minimal example for educational purposes. Feel free to extend it with additional features like:

- NFT support
- DeFi protocol integrations
- Transaction history
- Portfolio tracking
- Additional token standards

## License

MIT License - feel free to use this code for your own projects.
