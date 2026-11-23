import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // The HTTP client retries unanswered GETs once, including requests outside Query.
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
