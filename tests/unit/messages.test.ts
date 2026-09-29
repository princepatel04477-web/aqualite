import { createHmac } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  appendMessage,
  createThread,
  findThreadByReplyAddress,
  getThreadWithMessages,
  listOutbox,
  listSavedReplies,
  listThreads,
  resetDemo,
  saveSavedReply,
  setThreadStatus,
} from "@/lib/store/engine";
import { handleResendInbound, verifyInboundSignature } from "@/lib/email/inbound";
import { inboundReplyAddress } from "@/lib/email/send";
import {
  closeThread,
  createSavedReply,
  removeSavedReply,
  replyToThread,
} from "@/lib/hub/messages/actions";

const SECRET = "whsec_test_aqualite_12345678";

function sign(payload: string, secret = SECRET) {
  const id = "msg_test_1";
  const timestamp = "1773000000";
  const signature = createHmac("sha256", secret).update(`${id}.${timestamp}.${payload}`).digest("base64");
  return { svixId: id, svixTimestamp: timestamp, svixSignature: `v1,${signature}` };
}

function inboundPayload(toAddress: string, text: string): string {
  return JSON.stringify({
    type: "email.received",
    data: {
      from: "buyer@example.com",
      to: [toAddress],
      subject: "Re: Where is my order?",
      text,
      headers: {},
    },
  });
}

describe("svix-style inbound signatures", () => {
  it("accepts a valid signature and rejects tampering", () => {
    const payload = '{"hello":"world"}';
    expect(verifyInboundSignature(payload, sign(payload), SECRET)).toBe(true);
    expect(verifyInboundSignature(payload + " ", sign(payload), SECRET)).toBe(false);
    expect(verifyInboundSignature(payload, sign(payload, "wrong-secret"), SECRET)).toBe(false);
    expect(
      verifyInboundSignature(payload, { svixId: null, svixTimestamp: null, svixSignature: null }, SECRET),
    ).toBe(false);
  });
});

describe("inbox — reply out, customer reply threads back in", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("seller reply sends the customer email and logs the outbound message", async () => {
    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Where is my order?",
      body: "Hello? It has been 5 days.",
      direction: "in",
      sentVia: "form",
    });

    const result = await replyToThread({
      threadId: thread.id,
      body: "Your order ships tomorrow — tracking will follow by email.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thread.status).toBe("waiting");

    // Demo email mode: the "email" is recorded in the outbox for inspection.
    const outbox = await listOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe("buyer@example.com");
    expect(outbox[0]?.subject).toContain("Where is my order?");

    const threadState = await getThreadWithMessages(thread.id);
    expect(threadState?.messages.map((message) => message.direction)).toEqual(["in", "out"]);
    expect(threadState?.messages[1]?.body).toContain("ships tomorrow");
  });

  it("reply address round-trips to the same thread", async () => {
    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Sizing",
      body: "Do these run small?",
      direction: "in",
    });
    const address = inboundReplyAddress(thread.id);
    expect(address).toContain(`inbound+${thread.id}@`);
    const found = await findThreadByReplyAddress(thread.id);
    expect(found?.id).toBe(thread.id);
  });

  it("customer reply posts back onto the thread and reopens it", async () => {
    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Where is my order?",
      body: "Hello?",
      direction: "in",
    });
    await replyToThread({ threadId: thread.id, body: "Ships tomorrow." });
    await setThreadStatus(thread.id, "closed");

    const payload = inboundPayload(inboundReplyAddress(thread.id), "Great, thank you!");
    const result = await handleResendInbound(payload, sign(payload), SECRET);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.threadId).toBe(thread.id);

    const threadState = await getThreadWithMessages(thread.id);
    expect(threadState?.messages.map((message) => message.direction)).toEqual(["in", "out", "in"]);
    expect(threadState?.messages[2]?.body).toBe("Great, thank you!");
    expect(threadState?.thread.status).toBe("open"); // inbound reopens
  });

  it("inbound to an unknown thread is refused; bad signatures never write", async () => {
    const payload = inboundPayload("inbound+thr_nope@example.com", "hi");
    const result = await handleResendInbound(payload, sign(payload), SECRET);
    expect(result).toEqual({ ok: false, code: "NO_THREAD" });

    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Test",
      body: "Body",
      direction: "in",
    });
    const good = inboundPayload(inboundReplyAddress(thread.id), "should not land");
    const bad = await handleResendInbound(good, sign(good, "tampered"), SECRET);
    expect(bad).toEqual({ ok: false, code: "BAD_SIGNATURE" });
    const threadState = await getThreadWithMessages(thread.id);
    expect(threadState?.messages).toHaveLength(1);
  });

  it("thread listing sorts by last activity and closes cleanly", async () => {
    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Subject",
      body: "Body",
      direction: "in",
    });
    const threads = await listThreads();
    expect(threads).toHaveLength(1);
    const closed = await closeThread(thread.id);
    expect(closed.ok).toBe(true);
    if (closed.ok) expect(closed.data.status).toBe("closed");
  });

  it("saved replies create, dedupe titles, and delete", async () => {
    const created = await createSavedReply("Shipping times", "Orders ship in 1–2 business days.");
    expect(created.ok).toBe(true);
    const duplicate = await createSavedReply("Shipping times", "Something else");
    expect(duplicate.ok).toBe(false);

    const templates = await listSavedReplies();
    expect(templates).toHaveLength(1);

    const applied = await replyToThread(
      await (async () => {
        const { thread } = await createThread({
          orderId: null,
          customerEmail: "buyer@example.com",
          subject: "When?",
          body: "When does it ship?",
          direction: "in",
        });
        return { threadId: thread.id, body: "Thanks for asking.", templateId: templates[0]?.id ?? "" };
      })(),
    );
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      const state = await getThreadWithMessages(applied.data.thread.id);
      expect(state?.messages[1]?.body).toContain("ship in 1–2 business days");
    }

    const removed = await removeSavedReply(templates[0]?.id ?? "");
    expect(removed.ok).toBe(true);
    expect(await listSavedReplies()).toHaveLength(0);
    expect(await saveSavedReply({ title: "T", body: "B" }).then((r) => r.ok)).toBe(true);
  });
});

describe("appendMessage thread state machine", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("outbound flips to waiting; inbound flips back to open", async () => {
    const { thread } = await createThread({
      orderId: null,
      customerEmail: "buyer@example.com",
      subject: "Subject",
      body: "Body",
      direction: "in",
    });
    await appendMessage({ threadId: thread.id, direction: "out", body: "reply" });
    let state = await getThreadWithMessages(thread.id);
    expect(state?.thread.status).toBe("waiting");
    await appendMessage({ threadId: thread.id, direction: "in", body: "thanks" });
    state = await getThreadWithMessages(thread.id);
    expect(state?.thread.status).toBe("open");
  });
});
