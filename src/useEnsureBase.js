import { useCallback, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';

// if the wallet never answers the switch request, give the button back
const SWITCH_TIMEOUT_MS = 60_000;

/**
 * Returns an async function that makes sure the connected wallet is on Base
 * before we ask it to sign. If it's on another network the wallet is asked to
 * switch (wagmi adds Base to the wallet first if it doesn't know it yet).
 * Resolves true when the wallet is on Base, false if the switch was refused,
 * isn't supported or got no answer, so callers can explain instead of failing
 * silently. Overlapping calls (a fast double tap) share one request.
 */
export function useEnsureBase() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const pending = useRef(null);

  return useCallback(() => {
    if (chainId === base.id) return Promise.resolve(true);
    if (pending.current) return pending.current;

    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), SWITCH_TIMEOUT_MS);
    });
    const request = switchChainAsync({ chainId: base.id })
      .then(() => true)
      .catch((err) => {
        console.warn('Wallet did not switch to Base:', err);
        return false;
      });

    pending.current = Promise.race([request, timeout]).finally(() => {
      clearTimeout(timer);
      pending.current = null;
    });
    return pending.current;
  }, [chainId, switchChainAsync]);
}
