// Envoi d'e-mails : à brancher sur ton fournisseur (Resend, Brevo, SMTP…).
// En développement, le message est simplement affiché dans la console.

import { MailtrapTransport } from "mailtrap";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { User } from "../database/prisma/generated/prisma/client";
import { verificationEmailTemplate } from "../lib/mailer/verification-template";
import { createAuthToken } from "./authTokens";

const transport = selectTransport(env.NODE_ENV);

const sender = {
  address: "hello@demomailtrap.co",
  name: "Mailtrap Test",
};
const recipients = ["anomshacket@gmail.com"];

export const sendVerificationEmail = async (user: User) => {
  const token = await createAuthToken(user.id, "verify_email", 60 * 24);
  const verifyUrl = `${env.APP_URL}/verifier-email?token=${token}`;
  const LOGO_URL = "";
  await sendMail(
    user.email,
    "Confirme ton adresse e-mail",
    verificationEmailTemplate(LOGO_URL, user.nom ?? "", verifyUrl, "24 heures"),
    `Bonjour ${user.nom ?? ""}, confirmez votre e-mail : ${verifyUrl}`
  );
};

// ? dynamic send email function
export async function sendMail(
  to: string,
  subject: string,
  html: any,
  text: string
) {
  // Check email

  try {
    await transport.sendMail({
      from: sender,
      to: recipients,
      html,
      text,
      subject,
    });

    console.log("Email envoye avec succes a ", to);
  } catch (e) {
    console.log("Erreur lor's de l'envoi de mail");
  }

  console.log(`\n📧 [mail] à: ${to}\n   objet: ${subject}\n   ${text}\n`);
}

// ? Selected trasport depending on environment
function selectTransport(nodeEnv: string) {
  if (nodeEnv === "development") {
    return nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "16b2a4f2957a59",
        pass: "35a7fc22f1f924",
      },
    });

    // production
  } else {
    return nodemailer.createTransport(
      MailtrapTransport({
        token: env.MAILTRAP_API_TOKEN,
      })
    );
  }
}
