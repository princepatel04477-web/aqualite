"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

export default function TrackPage() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  return (
    <div className="page-wrap max-w-xl py-16">
      <Heading level={1}>
        Track an <em>order</em>
      </Heading>
      <form
        className="mt-8 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void fetch("/api/track", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ number: form.get("number"), email: form.get("email") }),
          })
            .then((res) => res.json())
            .then((data: unknown) => {
              if (!data || typeof data !== "object" || !("ok" in data)) return;
              if (data.ok === true && "status" in data && typeof data.status === "string") {
                setStatus(data.status);
                setMessage("");
              } else {
                setStatus("");
                setMessage("We couldn't find that order.");
              }
            });
        }}
      >
        <input name="number" required placeholder="Order number" className="h-12 w-full border border-hairline bg-transparent px-3 font-mono outline-none" />
        <input name="email" type="email" required placeholder="Email" className="h-12 w-full border border-hairline bg-transparent px-3 outline-none" />
        <Button type="submit" variant="primary">Track</Button>
      </form>
      {status ? <p className="mt-6 capitalize">Status · {status.replaceAll("_", " ")}</p> : null}
      {message ? <p className="mt-6 text-mist">{message}</p> : null}
    </div>
  );
}
