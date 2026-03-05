import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  return transporter;
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    logger.warn(
      `OTP email skipped for ${email}: email transport is not configured`,
    );
    return;
  }

  await activeTransporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Astronomy Pathshala OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your OTP Code</h2>
        <p>Use this OTP to continue your password reset process:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">${otp}</p>
        <p>This code expires in ${env.OTP_EXPIRES_MINUTES} minutes.</p>
      </div>
    `,
  });
}

