"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ME_KEY } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // The login ended (expired, or the password was reset): check the account
    // again, which sends the app to the login page.
    const checkLogin = (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) void queryClient.invalidateQueries({ queryKey: ME_KEY });
    };
    const queryClient: QueryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) => {
          if (query.queryKey[0] !== ME_KEY[0]) checkLogin(error);
        },
      }),
      mutationCache: new MutationCache({ onError: checkLogin }),
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          // Don't retry auth or permission errors; retry network blips once.
          retry: (count, error) =>
            !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && count < 1,
        },
      },
    });
    return queryClient;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
