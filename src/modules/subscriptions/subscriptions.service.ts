import type {
  PlanType,
  Prisma,
} from "../../database/prisma/generated/prisma/client";
import { prisma } from "../../database/prisma/prisma-client";
import { notFound } from "../../lib/httpError";

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
