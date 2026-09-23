"use client";

import { useState } from "react";

import { contactAction } from "@/lib/content/actions";
import { company } from "@/content/site";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

export default function ContactPage() {
  const [message, setMessage] = useState("");
  return (
    <div className="page-wrap grid gap-12 py-16 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Heading level={1}>Write to <em>us</em>.</Heading>
        <form
          className="mt-8 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void contactAction({
              name: String(form.get("name") ?? ""),
              email: String(form.get("email") ?? ""),
              phone: String(form.get("phone") ?? ""),
              topic: String(form.get("topic") ?? ""),
              message: String(form.get("message") ?? ""),
              company: String(form.get("company") ?? ""),
            }).then((result) => setMessage(result.ok ? "Received. We'll reply within a working day." : result.error.message));
          }}
        >
          <input name="name" required placeholder="Name" className="h-12 border border-hairline bg-transparent px-3 outline-none" />
          <input name="email" type="email" required placeholder="Email" className="h-12 border border-hairline bg-transparent px-3 outline-none" />
          <input name="phone" placeholder="Phone (optional)" className="h-12 border border-hairline bg-transparent px-3 outline-none" />
          <select name="topic" className="h-12 border border-hairline bg-abyss px-3">
            <option>Order help</option>
            <option>Sizing</option>
            <option>Wholesale / retail partnership</option>
            <option>Other</option>
          </select>
          <textarea name="message" required minLength={8} placeholder="Message" className="min-h-32 border border-hairline bg-transparent px-3 py-3 outline-none" />
          <input name="company" className="hidden" tabIndex={-1} autoComplete="off" />
          <Button type="submit" variant="primary">Send</Button>
          {message ? <p className="text-small text-mist">{message}</p> : null}
        </form>
      </div>
      <aside className="lg:col-span-4 lg:col-start-9">
        <p className="font-mono text-eyebrow uppercase text-mist">Support</p>
        <p className="mt-3">{company.hours}</p>
        <p className="mt-2"><a className="link-draw" href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a></p>
        <p className="mt-2"><a className="link-draw" href={`tel:${company.supportPhone}`}>{company.supportPhone}</a></p>
      </aside>
    </div>
  );
}
