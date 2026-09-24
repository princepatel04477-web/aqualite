"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { sendOtpAction, verifyOtpAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="page-wrap max-w-xl py-20">
      <Heading level={1}>
        Welcome <em>back</em>.
      </Heading>
      <p className="mt-4 text-mist">A six-digit code, not a password. On this prototype the code appears here — email sending waits on a Resend key.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          if (!sent) {
            void sendOtpAction({ email }).then((result) => {
              if (!result.ok) setError(result.error.message);
              else {
                setSent(true);
                setDemo(result.data.demoCode);
              }
            });
            return;
          }
          void verifyOtpAction({ email, code, next }).then((result) => {
            if (!result.ok) setError(result.error.message);
            else router.push(result.data.next);
          });
        }}
      >
        <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full border border-hairline bg-transparent px-3 outline-none" />
        {sent ? (
          <>
            <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="code">Code</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} className="h-12 w-full border border-hairline bg-transparent px-3 font-mono tracking-[0.3em] outline-none" />
            {demo ? <p className="font-mono text-size text-sand">Prototype code {demo}</p> : null}
          </>
        ) : null}
        {error ? <p className="text-small text-danger">{error}</p> : null}
        <Button type="submit" variant="primary">{sent ? "Sign in" : "Send code"}</Button>
      </form>
      <p className="mt-8 text-small text-mist">Admin demo: sign in as admin@aqualite.in. The code still appears above.</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
