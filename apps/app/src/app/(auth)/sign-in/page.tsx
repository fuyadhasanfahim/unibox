import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Unibox" };

export default function SignInPage() {
  return (
    // useSearchParams (notice, next) needs a Suspense boundary.
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
