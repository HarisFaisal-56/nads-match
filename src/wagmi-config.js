/**
 * Wagmi configuration for Base Mainnet
 * Used by WagmiProvider at the app root.
 */
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

export const BUILDER_CODE = 'bc_uljqyc06';

// WalletConnect Project ID (public test key from RainbowKit).
// For production, create your own free ID at https://cloud.reown.com
const WC_PROJECT_ID = '21fef48091f12692cad574a6f7753643';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Nads Smash',
      preference: 'all',
    }),
    injected(),
    walletConnect({
      projectId: WC_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'Nads Smash',
        description: 'Match · Blast · Conquer — a Web3 match-3 game on Base',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://nadssmash.com',
        icons: [],
      },
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});
