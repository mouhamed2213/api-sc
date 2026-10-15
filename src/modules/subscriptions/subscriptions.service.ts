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

    // Référence explicitement simulée : ce n’est pas une preuve de paiement réel.
    const paymentRef = `SIMULATED-${ficheId}-${Date.now()}`;

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
        paymentRef,
      },
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
      payment: { mode: "simulation" as const, status: "confirmed" as const },
    };
  });
}

export const subscriptionKpi = async (): Promise<Kpi> => {
  // 1. Nombre total de fiches
  const nbrFiche = await prisma.fiche.count();

  // 2. Nombre de fiches actives — utilise count() au lieu de findMany()
  const nbrFicheActive = await prisma.fiche.count({
    where: { statut: "ACTIVE" },
  });

  // 3. Nombre de fiches payantes (plan != "ESSENTIELLE")
  const nbrPayingFiche = await prisma.fiche.count({
    where: {
      subscriptions: {
        some: {
          plan: {
            is: {
              type: { not: "ESSENTIELLE" },
            },
          },
        },
      },
    },
  });

  const dtoKpi = {
    nbrFiche,
    nbrFicheActive,
    nbrPayingFiche,
  };
  return dtoKpi;
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
