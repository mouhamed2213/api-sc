import { randomUUID } from "node:crypto";
import type {
  PlanType,
  Prisma,
} from "../../database/prisma/generated/prisma/client";
import { prisma } from "../../database/prisma/prisma-client";
import { conflict, forbidden, notFound } from "../../lib/httpError";
import { env } from "../../config/env";
import type { AuthUser } from "../../types/user";
import { ficheInclude, toFicheDto } from "../fiches/fiches.dto";
import { Kpi } from "./subscription.type";

const planInclude = {
  plan: { include: { limits: true } },
} satisfies Prisma.SubscriptionInclude;
export type EffectiveSubscription = Prisma.SubscriptionGetPayload<{
  include: typeof planInclude;
}>;

// Abonnement effectif d'une fiche = ACTIVE et non expiré. null => fiche expirée.
export async function getEffectiveSubscription(
  ficheId: number,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<EffectiveSubscription | null> {
  return db.subscription.findFirst({
    where: {
      ficheId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { startsAt: "desc" },
    include: planInclude,
  });
}

const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

type ActivateInput = {
  ficheId: number;
  planType: PlanType;
  endsAt?: Date | null; // undefined => calculé à partir de plan.dureeMois ; null => sans échéance
  amountFcfa?: number | null;
  paymentRef?: string | null;
};

// Remplace l'abonnement actif par un nouveau, dans une seule transaction.
export async function activateSubscription(input: ActivateInput) {
  return prisma.$transaction(async tx => {
    const plan = await tx.plan.findUnique({ where: { type: input.planType } });
    if (!plan || !plan.actif)
      throw notFound("Formule introuvable ou désactivée");

    const now = new Date();
    await tx.subscription.updateMany({
      where: { ficheId: input.ficheId, status: "ACTIVE" },
      data: { status: "CANCELED", canceledAt: now },
    });

    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
        : plan.dureeMois
          ? addMonths(now, plan.dureeMois)
          : null;

    return tx.subscription.create({
      data: {
        ficheId: input.ficheId,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: now,
        endsAt,
        amountFcfa: input.amountFcfa ?? plan.prixFcfa,
        paymentRef: input.paymentRef ?? null,
      },
    });
  });
}

// À lancer régulièrement (voir server.ts) : marque EXPIRED les abonnements arrivés à échéance.
export async function expireDueSubscriptions() {
  const { count } = await prisma.subscription.updateMany({
    where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
  return count;
}

const PLAN_RANK: Record<PlanType, number> = {
  ESSENTIELLE: 0,
  PRO: 1,
  SIGNATURE: 2,
};

// Upgrade simulé : aucun prestataire de paiement réel n’est appelé.
// La formule et ses limites deviennent immédiatement effectives en base.
export async function upgrade(
  user: AuthUser,
  ficheId: number,
  planType: PlanType
) {
  if (user.role !== "CLIENT")
    throw forbidden("ACCES_REFUSE", "Cette action est réservée aux clients");

  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified)
    throw forbidden(
      "EMAIL_NON_VERIFIE",
      "Confirme ton adresse e-mail avant de changer de formule"
    );

  return prisma.$transaction(async tx => {
    const fiche = await tx.fiche.findUnique({
      where: { id: ficheId },
      select: { id: true, userId: true, statut: true },
    });

    // Ne pas révéler l’existence d’une fiche qui appartient à un autre compte.
    if (!fiche || fiche.userId !== user.id)
      throw notFound("Fiche introuvable");

    if (fiche.statut === "SUSPENDUE")
      throw forbidden(
        "FICHE_SUSPENDUE",
        "Cette fiche est suspendue : changement de formule impossible"
      );

    const [currentSubscription, targetPlan] = await Promise.all([
      getEffectiveSubscription(ficheId, tx),
      tx.plan.findUnique({ where: { type: planType }, include: { limits: true } }),
    ]);

    if (!targetPlan || !targetPlan.actif)
      throw notFound("Formule introuvable ou désactivée");

    const currentPlanType = currentSubscription?.plan.type ?? "ESSENTIELLE";
    if (PLAN_RANK[planType] <= PLAN_RANK[currentPlanType])
      throw conflict(
        "FORMULE_NON_SUPERIEURE",
        "Choisis une formule supérieure à celle actuellement active"
      );

    const now = new Date();
    const endsAt = targetPlan.dureeMois
      ? addMonths(now, targetPlan.dureeMois)
      : null;

    // Étape 1 : créer une trace de paiement en attente.
    // En mode réel, cette étape renverra le client vers le fournisseur et
    // laissera le paiement PENDING jusqu'à une confirmation serveur vérifiée.
    const paymentRef = `SIMULATED-${ficheId}-${randomUUID()}`;
    const pendingPayment = await tx.payment.create({
      data: {
        ficheId,
        provider: "SIMULATION",
        status: "PENDING",
        amountFcfa: targetPlan.prixFcfa ?? 0,
        currency: "XOF",
        providerReference: paymentRef,
      },
    });

    // Étape 2 : adaptateur de simulation. Seul le code de confirmation fait
    // passer le paiement à SUCCEEDED ; l'activation arrive après cette étape.
    // Remplacer cet adaptateur par la confirmation vérifiée de Wave/Orange Money
    // lors de l'intégration réelle, sans changer les règles d'activation.
    const confirmedPayment = await tx.payment.update({
      where: { id: pendingPayment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: now,
      },
    });

    // Étape 3 : appliquer la formule uniquement après confirmation.
    await tx.subscription.updateMany({
      where: { ficheId, status: "ACTIVE" },
      data: { status: "CANCELED", canceledAt: now },
    });

    const subscription = await tx.subscription.create({
      data: {
        ficheId,
        planId: targetPlan.id,
        status: "ACTIVE",
        startsAt: now,
        endsAt,
        amountFcfa: targetPlan.prixFcfa ?? 0,
        paymentRef: confirmedPayment.providerReference,
      },
    });

    await tx.payment.update({
      where: { id: confirmedPayment.id },
      data: { subscriptionId: subscription.id },
    });

    const updatedFiche = await tx.fiche.findUnique({
      where: { id: ficheId },
      include: ficheInclude,
    });
    if (!updatedFiche) throw notFound("Fiche introuvable");

    const effectiveSubscription = await getEffectiveSubscription(ficheId, tx);
    return {
      subscription,
      fiche: toFicheDto(updatedFiche, effectiveSubscription),
      payment: {
        id: confirmedPayment.id,
        reference: confirmedPayment.providerReference,
        mode: "simulation" as const,
        status: "confirmed" as const,
      },
    };
  });
}

export const subscriptionKpi = async (user: AuthUser): Promise<Kpi> => {
  const ficheScope = user.role === "ADMIN" ? {} : { userId: user.id };

  const [nbrFiche, nbrFicheActive, nbrPayingFiche] = await Promise.all([
    prisma.fiche.count({ where: ficheScope }),
    prisma.fiche.count({
      where: { ...ficheScope, statut: "ACTIVE" },
    }),
    prisma.fiche.count({
      where: {
        ...ficheScope,
        subscriptions: {
          some: {
            status: "ACTIVE",
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            plan: { is: { type: { not: "ESSENTIELLE" } } },
          },
        },
      },
    }),
  ]);

  return { nbrFiche, nbrFicheActive, nbrPayingFiche };
};

export const filter = async (plan: string) => {
  const filterByPlan = await prisma.plan.findMany({
    where: {
      type: "ESSENTIELLE", // remplace par la valeur souhaitée
    },
  });

  // console.log(filterByPlan.map(f => {f.}));

  return filterByPlan;
};
