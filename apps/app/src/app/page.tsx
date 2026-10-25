import { redirect } from "next/navigation";

// The proxy normally redirects "/" first; this is the fallback.
export default function Home() {
  redirect("/dashboard");
}
