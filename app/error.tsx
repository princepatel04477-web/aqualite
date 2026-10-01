"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { logger } from "@/lib/logger";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("app.error", { digest: error.digest ?? "none" });
  }, [error]);
  return (
    <div className="page-wrap py-24">
      <Heading level={1}>Something went <em>quiet</em>.</Heading>
      <p className="mt-4 text-mist">Try again. If it keeps happening, write to us with the time.</p>
      <Button className="mt-8" variant="primary" onClick={reset}>Try again</Button>
    </div>
  );
}
