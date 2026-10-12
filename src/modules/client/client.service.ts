import { prisma } from "../../database/prisma/prisma-client";
import { AuthUser } from "../../types/user";

export const ClientService = {
  detailFiche: async (user: AuthUser) => {
    const getFiche = await prisma.fiche.findMany({
      where: { userId: user.id },
    });

    return getFiche;
  },
};
