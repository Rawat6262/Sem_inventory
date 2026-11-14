import type { Metadata } from "next";
import { VerifyOtpForm } from "./verify-otp-form";

export const metadata: Metadata = { title: "Verify account" };

export default function VerifyOtpPage() {
  return <VerifyOtpForm />;
}
