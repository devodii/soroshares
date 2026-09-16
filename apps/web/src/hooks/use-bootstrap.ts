"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface BootstrapState {
  dpriIssuer: string;
  dpriSac: string;
  usdcIssuer: string;
  usdcSac: string;
  offerContract: string;
  offerCloseLedger: number;
  offerGraceLedgers: number;
  adminPublic: string;
  updatedAt: string;
}

export interface BootstrapOptions {
  closeWindowDays?: number;
  graceDays?: number;
  redeploy?: boolean;
}

export function useBootstrapStatus() {
  return useQuery({
    queryKey: ["bootstrap-status"],
    queryFn: () => apiFetch<BootstrapState | { bootstrapped: false }>("/api/admin/bootstrap"),
  });
}

export function useRunBootstrap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options: BootstrapOptions) =>
      apiFetch<BootstrapState>("/api/admin/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(options),
      }),
    onSuccess: (state) => {
      queryClient.setQueryData(["bootstrap-status"], state);
    },
  });
}
