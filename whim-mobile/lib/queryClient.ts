import { QueryClient } from '@tanstack/react-query';

// Shared React Query client. Lives here (not in _layout) so auth can clear it on
// account switch — otherwise one account's cached friends / viewer / feed
// sections would flash for the next person who signs in on this device.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});
