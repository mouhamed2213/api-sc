import { prisma } from "../../database/prisma/prisma-client";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../../types/user";
import { MediaService } from "../media/media.service";
import { collectStoredMediaKeys } from "../media/media.validation";
import { ficheInclude } from "./fiches.dto";
import { normalizeMediaReferences } from "./fiches.media-references";
import type { UpdateFicheInput } from "./fiches.schemas";
import { FicheService } from "./fiches.service";

const loadFull = (id: number) =>
  prisma.fiche.findUnique({ where: { id }, include: ficheInclude });

// Même mise à jour que FicheService.updateFiche, avec en plus :
//  1. les URL de média sont ramenées à leur forme relative avant l'enregistrement ;
//  2. après une sauvegarde réussie, les médias qui ne sont plus utilisés sont supprimés du stockage.
// FicheService n'est pas modifié : on l'appelle, puis on fait le ménage.
export async function updateFicheWithMedia(
  user: AuthUser,
  id: number,
  rawInput: UpdateFicheInput
) {
  const previous = await loadFull(id);
  const dto = await FicheService.updateFiche(
    user,
    id,
    normalizeMediaReferences(rawInput)
  );

  const updated = await loadFull(id);
  if (previous && updated) {
    const previousKeys = collectStoredMediaKeys(previous, id);
    const currentKeys = collectStoredMediaKeys(updated, id);
    for (const key of [...previousKeys].filter(k => !currentKeys.has(k))) {
      try {
        await MediaService.deleteStoredMedia(id, key);
      } catch (error) {
        // La sauvegarde est déjà validée : une erreur de nettoyage ne doit pas la faire échouer.
        logger.warn("Removed fiche media could not be deleted from storage", {
          ficheId: id,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  logger.info("Fiche updated", { ficheId: id, userId: user.id });
  return dto;
}
