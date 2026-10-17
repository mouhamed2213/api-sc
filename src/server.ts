import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma/prisma-client";
import { expireDueSubscriptions } from "./modules/subscriptions/subscriptions.service";
import { cleanupOrphanedMedia } from "./modules/media/media.cleanup";

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

// Nettoie les uploads abandonnés (24 h de grâce). Uniquement si le stockage S3 est configuré.
const storageConfigured = Boolean(
  env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_ENDPOINT
);
const runMediaCleanup = () =>
  cleanupOrphanedMedia().catch(error =>
    console.error("Nettoyage des médias orphelins échoué :", error instanceof Error ? error.message : error)
  );
const mediaCleanupTimer = storageConfigured
  ? setInterval(runMediaCleanup, 24 * 60 * 60_000)
  : undefined;
const mediaCleanupInitialTimer = storageConfigured
  ? setTimeout(runMediaCleanup, 10 * 60_000)
  : undefined;

const shutdown = async () => {
  clearInterval(timer);
  if (mediaCleanupTimer) clearInterval(mediaCleanupTimer);
  if (mediaCleanupInitialTimer) clearTimeout(mediaCleanupInitialTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
