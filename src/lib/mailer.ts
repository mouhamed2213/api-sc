// Envoi d'e-mails : à brancher sur ton fournisseur (Resend, Brevo, SMTP…).
// En développement, le message est simplement affiché dans la console.

import { env } from "../config/env";
import { User } from "../database/prisma/generated/prisma/client";
import { createAuthToken } from "./authTokens";

export const sendVerificationEmail = async (user: User) => {
  const token = await createAuthToken(user.id, "verify_email", 60 * 24);
  await sendMail(
    user.email,
    "Confirme ton adresse e-mail",
    `${env.APP_URL}/verifier-email?token=${token}`
  );
};

export async function sendMail(to: string, subject: string, text: string) {
  console.log(
    `\n📧 [mail simulé] à: ${to}\n   objet: ${subject}\n   ${text}\n`
  );
}
