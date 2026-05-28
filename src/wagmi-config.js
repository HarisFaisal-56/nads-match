/**
 * Wagmi configuration for Base Mainnet
 * Used by WagmiProvider at the app root.
 */
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const BUILDER_CODE = 'bc_uljqyc06';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Nads Smash',
      preference: 'all',
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(),
  },
});
