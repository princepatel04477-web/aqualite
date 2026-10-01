"use client";

import { useState } from "react";

import { profileAction, signOutAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  return (
    <div className="page-wrap max-w-xl py-16">
      <Heading level={1}>Profile</Heading>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void profileAction({ fullName: String(form.get("fullName") ?? ""), phone: String(form.get("phone") ?? "") }).then((result) => {
            setMessage(result.ok ? "Saved." : result.error.message);
          });
        }}
      >
        <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="fullName">Name</label>
        <input id="fullName" name="fullName" className="h-12 w-full border border-hairline bg-transparent px-3 outline-none" />
        <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="phone">Phone</label>
        <input id="phone" name="phone" className="h-12 w-full border border-hairline bg-transparent px-3 outline-none" />
        <Button type="submit" variant="primary">Save</Button>
        {message ? <p className="text-small text-mist">{message}</p> : null}
      </form>
      <form className="mt-10" action={signOutAction}>
        <Button type="submit" variant="ghost">Sign out</Button>
      </form>
    </div>
  );
}
