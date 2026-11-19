"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export type Me = {
  _id: string;
  full_name: string;
  gmail: string;
  role: string;
  mobile_number?: number | string;
  extraModules?: string[]; // modules an admin granted on top of the role
  removedModules?: string[]; // role modules an admin took away
};

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await authApi<{ user: Me }>("me")).user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
