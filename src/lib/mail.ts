import nodemailer from "nodemailer";

import { optionalEnv } from "@/lib/env";
import { logError } from "@/lib/logger";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult = { ok: true } | { ok: false; reason: string };

function senderAddress(): string {
  const address = optionalEnv("MAIL_FROM", "no-reply@example.com")!;
  const name = optionalEnv("MAIL_FROM_NAME", "TVET Digital Feedback")!;
  return `${name} <${address}>`;
}

async function sendWithResend(message: MailMessage): Promise<MailResult> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderAddress(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    logError("mail.resend_failed", { status: response.status });
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

async function sendWithSmtp(message: MailMessage): Promise<MailResult> {
  const host = optionalEnv("SMTP_HOST");
  const user = optionalEnv("SMTP_USER");
  const pass = optionalEnv("SMTP_PASS");
  if (!host || !user || !pass) return { ok: false, reason: "not_configured" };

  const port = Number(optionalEnv("SMTP_PORT", "587"));
  const secure = optionalEnv("SMTP_SECURE", "tls") === "ssl";

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from: senderAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { ok: true };
  } catch {
    logError("mail.smtp_failed", {});
    return { ok: false, reason: "send_failed" };
  }
}

/**
 * Sends through Resend when configured, then SMTP, then — in development only —
 * prints the message so registration can be tested without an inbox.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (optionalEnv("RESEND_API_KEY")) {
    const res = await sendWithResend(message);
    if (res.ok) return res;
  }

  if (optionalEnv("SMTP_USER") && optionalEnv("SMTP_PASS")) {
    const res = await sendWithSmtp(message);
    if (res.ok) return res;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("\n=======================================================");
    console.info("[mail:dev] 2FA EMAIL DISPATCH (Development Mode)");
    console.info(`To: ${message.to}`);
    console.info(`Subject: ${message.subject}`);
    console.info(`Content:\n${message.text}`);
    console.info("=======================================================\n");
    return { ok: true };
  }

  logError("mail.not_configured", {});
  return { ok: false, reason: "send_failed" };
}
