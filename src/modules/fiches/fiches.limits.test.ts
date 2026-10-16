import { describe, expect, it } from "vitest";
import type { PlanLimit } from "../../database/prisma/generated/prisma/client";
import type { UpdateFicheInput } from "./fiches.schemas";
import { enforcePlanLimits } from "./fiches.limits";

const baseLimits = {
  tabsAutorises: ["PRESENTATION", "RESEAUX", "LOCALISATION"],
  headerLayouts: ["PORTRAIT"],
  themes: ["BLEU"],
  canReorder: false,
  canHide: false,
  canAdd: false,
  canRename: false,
  maxCustomTabs: 0,
  maxPresentation: 280,
  maxSocial: 3,
  maxLinks: 0,
  maxPhotos: 0,
  maxVideos: 0,
  maxCatalogSections: 0,
  maxCatalogArticlesPerSection: 0,
  catalogPrices: false,
  maxMenuSections: 0,
  maxMenuItemsPerSection: 0,
  menuVideoPerItem: false,
  maxMenuVideoSeconds: 0,
  maxBiens: 0,
  maxPhotosPerBien: 0,
  hasCatalog: false,
  hasMenu: false,
  hasBiens: false,
  hasGoogleReview: false,
  hasStats: false,
  hasForm: false,
  hasDashboard: false,
} as unknown as PlanLimit;

const currentTabs = [
  { type: "PRESENTATION", titre: null, visible: true, position: 0 },
  { type: "RESEAUX", titre: null, visible: true, position: 1 },
];

const updateWithTabs = (onglets: Array<{ type: "presentation" | "reseaux" | "localisation" | "texte"; titre?: string; visible?: boolean }>) =>
  ({ data: { onglets: onglets.map(o => ({ visible: true, ...o })) } }) as UpdateFicheInput;

describe("enforcePlanLimits — capacités des onglets", () => {
  it("refuse un nouveau bloc si canAdd est false", () => {
    expect(() => enforcePlanLimits(baseLimits, updateWithTabs([
      { type: "presentation" }, { type: "reseaux" }, { type: "localisation" },
    ]), currentTabs)).toThrow();
  });

  it("refuse la réorganisation si canReorder est false", () => {
    expect(() => enforcePlanLimits(baseLimits, updateWithTabs([
      { type: "reseaux" }, { type: "presentation" },
    ]), currentTabs)).toThrow();
  });

  it("refuse le masquage si canHide est false", () => {
    expect(() => enforcePlanLimits(baseLimits, updateWithTabs([
      { type: "presentation" }, { type: "reseaux", visible: false },
    ]), currentTabs)).toThrow();
  });

  it("refuse le renommage si canRename est false", () => {
    expect(() => enforcePlanLimits(baseLimits, updateWithTabs([
      { type: "presentation", titre: "Mon accueil" }, { type: "reseaux" },
    ]), currentTabs)).toThrow();
  });

  it("autorise ces opérations lorsque la formule accorde les capacités", () => {
    const signature = { ...baseLimits, tabsAutorises: ["PRESENTATION", "RESEAUX", "LOCALISATION", "TEXTE"], canAdd: true, canReorder: true, canHide: true, canRename: true, maxCustomTabs: 4 } as PlanLimit;
    expect(() => enforcePlanLimits(signature, updateWithTabs([
      { type: "reseaux", visible: false, titre: "Mes réseaux" },
      { type: "presentation" },
      { type: "localisation" },
      { type: "texte", titre: "À propos" },
    ]), currentTabs)).not.toThrow();
  });
});
