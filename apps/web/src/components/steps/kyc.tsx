"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepCard, StepStatus } from "@/components/step-card";
import { useAccount } from "@/hooks/use-account";
import { useKycStatus, useSubmitKyc } from "@/hooks/use-kyc";
import { useWallet } from "@/hooks/use-wallet";
import { AFRICAN_COUNTRIES } from "@/lib/african-countries";

const kycSchema = z.object({
  first_name: z.string().min(1, "required"),
  last_name: z.string().min(1, "required"),
  birth_date: z.string().min(1, "required"),
  address_country_code: z.string().min(1, "required"),
  bank_account_number: z.string().regex(/^\d{11}$/, "BVN must be exactly 11 digits"),
  email_address: z.email("invalid email"),
});

type KycFormValues = z.infer<typeof kycSchema>;

const DEMO_DATA: KycFormValues = {
  first_name: "Demo",
  last_name: "Subscriber",
  birth_date: "1996-01-01",
  address_country_code: "NG",
  bank_account_number: "12345678901",
  email_address: "demo@soroshares.test",
};

export function KycStep() {
  const { address, token, signingIn, signIn } = useWallet();
  const { data: account } = useAccount(address);
  const { data: kyc } = useKycStatus(token);
  const submitKyc = useSubmitKyc(token);

  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      birth_date: "",
      address_country_code: "NG",
      bank_account_number: "",
      email_address: "",
    },
  });
  const countryCode = useWatch({ control: form.control, name: "address_country_code" });

  const trustlineOpen = account ? account.dpri !== "0" || account.dpriAuthorized : false;
  const status: StepStatus =
    !address || !trustlineOpen ? "pending" : kyc?.status === "ACCEPTED" ? "done" : "active";

  async function handleSignIn() {
    try {
      await signIn();
    } catch (err) {
      toast.error("Sign in failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function onSubmit(values: KycFormValues) {
    try {
      const record = await submitKyc.mutateAsync(values);
      if (record.status === "REJECTED") {
        toast.error("KYC rejected", { description: record.message });
      } else {
        toast.success("KYC submitted");
      }
    } catch (err) {
      toast.error("KYC submission failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <StepCard step={3} title="Verify identity" status={status}>
      {!token && (
        <Button onClick={handleSignIn} disabled={!address || !trustlineOpen || signingIn}>
          {signingIn ? "Signing in…" : "Sign in"}
        </Button>
      )}
      {token && kyc?.status !== "ACCEPTED" && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2"
            onClick={() => form.reset(DEMO_DATA)}
          >
            Use demo data
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" {...form.register("first_name")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...form.register("last_name")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="birth_date">Date of birth</Label>
            <Input id="birth_date" type="date" {...form.register("birth_date")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bank_account_number">BVN</Label>
            <Input
              id="bank_account_number"
              inputMode="numeric"
              maxLength={11}
              {...form.register("bank_account_number")}
            />
            {form.formState.errors.bank_account_number && (
              <p className="text-xs text-destructive">
                {form.formState.errors.bank_account_number.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="address_country_code">Country</Label>
            <Select
              value={countryCode}
              onValueChange={(value) => value && form.setValue("address_country_code", value)}
            >
              <SelectTrigger id="address_country_code" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AFRICAN_COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email_address">Email</Label>
            <Input id="email_address" type="email" {...form.register("email_address")} />
          </div>

          <Button type="submit" disabled={submitKyc.isPending}>
            {submitKyc.isPending ? "Submitting…" : "Submit"}
          </Button>
        </form>
      )}
      {kyc?.status === "NEEDS_INFO" && (
        <Alert>
          <AlertDescription>{kyc.message ?? "add DPRI trustline first"}</AlertDescription>
        </Alert>
      )}
      {kyc?.status === "ACCEPTED" && (
        <p className="text-sm text-muted-foreground">
          KYC accepted.{" "}
          {account?.dpriAuthorized ? "Trustline authorized." : "Waiting for issuer authorization…"}
        </p>
      )}
    </StepCard>
  );
}
