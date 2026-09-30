import nodemailer from "nodemailer";

export const runtime = "nodejs";

type ContactInquiry = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  state?: string;
  topic?: string;
  message?: string;
  consent?: boolean;
  source?: string;
  submittedAt?: string;
};

const requiredEnvironment = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CONTACT_RECEIVER"] as const;

export async function POST(request: Request) {
  const missing = requiredEnvironment.filter((name) => !process.env[name]);
  if (missing.length) return Response.json({ ok: false, error: "Mail is not configured." }, { status: 503 });

  let inquiry: ContactInquiry;
  try {
    inquiry = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!inquiry.firstName || !inquiry.email || !inquiry.state || !inquiry.topic || !inquiry.consent) {
    return Response.json({ ok: false, error: "Missing required contact details." }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: `"BetterMind Web Form" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_RECEIVER,
      replyTo: inquiry.email,
      subject: `BetterMind contact inquiry: ${inquiry.topic}`,
      text: [
        `Name: ${inquiry.firstName} ${inquiry.lastName ?? ""}`.trim(),
        `Email: ${inquiry.email}`,
        `Phone: ${inquiry.phone || "Not provided"}`,
        `State: ${inquiry.state}`,
        `Topic: ${inquiry.topic}`,
        `Consent: ${inquiry.consent ? "Yes" : "No"}`,
        `Source: ${inquiry.source || "contact-page"}`,
        `Submitted: ${inquiry.submittedAt || new Date().toISOString()}`,
        "",
        inquiry.message || "No message provided.",
      ].join("\n"),
    });
  } catch {
    return Response.json({ ok: false, error: "Unable to send inquiry." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
