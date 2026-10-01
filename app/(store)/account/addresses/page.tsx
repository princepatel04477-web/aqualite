"use client";

import { useState } from "react";

import { addressAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

export default function AddressesPage() {
  const [message, setMessage] = useState("");
  return (
    <div className="page-wrap max-w-xl py-16">
      <Heading level={1}>Addresses</Heading>
      <form
        className="mt-8 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void addressAction({
            name: String(form.get("name") ?? ""),
            phone: String(form.get("phone") ?? ""),
            line1: String(form.get("line1") ?? ""),
            line2: "",
            landmark: "",
            city: String(form.get("city") ?? ""),
            state: String(form.get("state") ?? "Maharashtra"),
            pincode: String(form.get("pincode") ?? ""),
          }).then((result) => setMessage(result.ok ? "Saved." : result.error.message));
        }}
      >
        {["name", "phone", "line1", "city", "state", "pincode"].map((field) => (
          <input key={field} name={field} placeholder={field} required className="h-12 border border-hairline bg-transparent px-3 outline-none" />
        ))}
        <Button type="submit" variant="primary">Save address</Button>
        {message ? <p className="text-small text-mist">{message}</p> : null}
      </form>
    </div>
  );
}
