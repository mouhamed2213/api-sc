// import { asyncHandler } from "../../lib/asyncHandler";


// export const AuthController = {

//       asyncHandler(async (req, res) => {
//         const id = Number(req.params.id);
//         const { slug, statut, userId } = req.body as z.infer<
//           typeof patchFicheSchema
//         >;
//         if (
//           !(await prisma.fiche.findUnique({ where: { id }, select: { id: true } }))
//         )
//           throw notFound("Fiche introuvable");
    
//         const fiche = await prisma.fiche.update({
//           where: { id },
//           data: {
//             slug,
//             userId,
//             statut: statut ? (statut.toUpperCase() as StatutFiche) : undefined,
//           },
//           include: ficheInclude,
//         });
//         res.json({ fiche: toFicheDto(fiche, await getEffectiveSubscription(id)) });
//       })
// }