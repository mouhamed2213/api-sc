import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma/prisma-client";
import { expireDueSubscriptions } from "./modules/subscriptions/subscriptions.service";

const server = app.listen(env.PORT, () => {
  console.log(
    `✔ API Support Connecté sur http://localhost:${env.PORT}/api (${env.NODE_ENV})`
  );
});

// Marque « expirés » les abonnements arrivés à échéance (au démarrage puis toutes les heures).
const runExpiry = () =>
  expireDueSubscriptions()
    .then(n => n && console.log(`${n} abonnement(s) expiré(s)`))
    .catch(console.error);
runExpiry();
const timer = setInterval(runExpiry, 60 * 60_000);

const shutdown = async () => {
  clearInterval(timer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
