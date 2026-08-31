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

const requiredEnvironment = ["MAIL_USER", "MAIL_APP_PASSWORD", "MAIL_TO"] as const;

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
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_TO,
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
