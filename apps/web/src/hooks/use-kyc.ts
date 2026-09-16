"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type KycStatus = "ACCEPTED" | "REJECTED" | "NEEDS_INFO";

export interface KycRecord {
  id: string;
  status: KycStatus;
  message?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  address_country_code: string;
  bank_account_number: string;
  email_address: string;
}

export interface KycSubmission {
  first_name: string;
  last_name: string;
  birth_date: string;
  address_country_code: string;
  bank_account_number: string;
  email_address: string;
}

export function useKycStatus(token: string | null) {
  return useQuery({
    queryKey: ["kyc", token],
    queryFn: async (): Promise<KycRecord | null> => {
      const res = await fetch("/api/kyc/customer", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error((await res.json()).error ?? "failed to load KYC status");
      return res.json();
    },
    enabled: Boolean(token),
  });
}

export function useSubmitKyc(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submission: KycSubmission): Promise<KycRecord> => {
      if (!token) throw new Error("sign in first");
      const res = await fetch("/api/kyc/customer", {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(submission),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "KYC submission failed");
      return res.json();
    },
    onSuccess: (record) => {
      queryClient.setQueryData(["kyc", token], record);
    },
  });
}
