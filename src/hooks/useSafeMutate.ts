import { useCallback } from 'react';

export function useSafeMutate(onMutate: () => void | Promise<void>) {
  return useCallback(() => {
    void Promise.resolve(onMutate()).catch(() => {
      // Refresh failures are non-critical for local optimistic state.
    });
  }, [onMutate]);
}
