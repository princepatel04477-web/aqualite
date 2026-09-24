"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { subscribeAction } from "@/lib/content/actions";
import { footerColumns, company } from "@/content/site";
import { Button } from "@/components/ui/Button";

export function Footer() {
  const pathname = usePathname();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const year = new Date().getFullYear();
  const hideNewsletter = pathname === "/";

  return (
    <footer className="border-t border-hairline bg-abyss">
      {hideNewsletter ? null : (
        <div className="page-wrap grid gap-8 py-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="font-mono text-eyebrow uppercase text-aqua">Newsletter</p>
            <p className="heading-display mt-3 font-display text-h2">
              Monsoon drops, <em>first</em>.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 lg:col-span-5 lg:col-start-8 lg:justify-end"
            action={async (formData) => {
              const result = await subscribeAction(formData);
              if (!result.ok) setError(result.error.message);
              else {
                setError("");
                setDone(true);
              }
            }}
          >
            <label className="font-mono text-eyebrow uppercase text-mist" htmlFor="footer-email">
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="footer-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="h-12 flex-1 border border-hairline bg-transparent px-3 text-foam outline-none"
              />
              <Button type="submit" variant="primary">
                {done ? "Joined" : "Join"}
              </Button>
            </div>
            {error ? <p className="text-small text-danger">{error}</p> : null}
            <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />
          </form>
        </div>
      )}
      <div className="page-wrap grid gap-10 border-t border-hairline py-12 sm:grid-cols-2 lg:grid-cols-4">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-eyebrow uppercase text-mist">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-draw font-body text-small text-foam">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="overflow-hidden px-page">
        <p className="select-none text-center font-display text-mark leading-none text-foam/[0.06]">
          Aqualite
        </p>
      </div>
      <div className="page-wrap flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-4 font-mono text-eyebrow uppercase text-mist">
        <span>© {year} Aqualite</span>
        {company.verified ? <span>GSTIN {company.gstin}</span> : null}
        <span>UPI · Cards · COD</span>
      </div>
    </footer>
  );
}
