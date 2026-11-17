import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAllowedTecoRoute, isAllowedTecoRoute } from "./allowedRoutes.js";
import { ROUTE_GUIDES, getRouteGuide } from "./routeGuide.js";
import {
  TECO_TOURS,
  getTourById,
  getTourStatus,
  getRecommendedTourForRoute,
} from "./tourRegistry.js";

test("allowedRoutes permite apenas rotas internas válidas e bloqueia URLs externas", () => {
  assert.deepStrictEqual(normalizeAllowedTecoRoute("/comparativo"), {
    pathname: "/comparativo",
    search: "",
    full: "/comparativo",
  });
  assert.deepStrictEqual(normalizeAllowedTecoRoute("/assistente?origem=%2Forcamentos&x=1"), {
    pathname: "/assistente",
    search: "?origem=%2Forcamentos",
    full: "/assistente?origem=%2Forcamentos",
  });

  assert.strictEqual(isAllowedTecoRoute("https://evil.example/phish"), false);
  assert.strictEqual(isAllowedTecoRoute("//evil.example"), false);
  assert.strictEqual(isAllowedTecoRoute("javascript:alert(1)"), false);
  assert.strictEqual(isAllowedTecoRoute("/rota-inexistente"), false);
  assert.strictEqual(isAllowedTecoRoute("/admin", { role: "user" }), false);
  assert.strictEqual(isAllowedTecoRoute("/admin", { role: "admin" }), true);
});

test("catálogo possui 14+ fluxos reais e tour multi-rota primeiros-passos", () => {
  assert.ok(TECO_TOURS.length >= 14);
  const onboarding = getTourById("primeiros-passos");
  assert.ok(onboarding);

  const distinctRoutes = new Set(onboarding.steps.map((s) => s.route));
  assert.ok(distinctRoutes.size >= 3, "primeiros-passos deve atravessar 3+ rotas");

  for (const tour of TECO_TOURS) {
    assert.ok(tour.version >= 1);
    assert.ok(isAllowedTecoRoute(tour.entryRoute), `entryRoute inválida: ${tour.entryRoute}`);
    assert.ok(tour.steps.length >= 2, `tour ${tour.id} precisa de pelo menos 2 passos`);
    for (const step of tour.steps) {
      assert.ok(isAllowedTecoRoute(step.route), `step.route inválida em ${tour.id}: ${step.route}`);
      assert.match(step.target, /^\[data-tour="[a-z0-9-]+"\]$/, `target deve usar data-tour estável: ${step.target}`);
    }
  }
});

test("guias por tela usam somente rotas permitidas em nextSteps e tours existentes", () => {
  for (const guide of Object.values(ROUTE_GUIDES)) {
    assert.ok(isAllowedTecoRoute(guide.route, { role: "admin" }));
    assert.ok(getTourById(guide.recommendedTourId), `tour recomendado ausente em ${guide.route}`);
    for (const next of guide.nextSteps || []) {
      assert.ok(isAllowedTecoRoute(next.route), `nextStep inválido em ${guide.route}: ${next.route}`);
    }
  }
  assert.strictEqual(getRouteGuide("/desconhecida").route, "/comparativo");
  assert.strictEqual(getRecommendedTourForRoute("/orcamentos").id, "orcamentos");
});

test("getTourStatus detecta conclusão atual vs versão desatualizada sem invalidar outros tours", () => {
  const comparativo = getTourById("comparativo");
  const orcamentos = getTourById("orcamentos");
  const upgradedComparativo = { ...comparativo, version: comparativo.version + 1 };

  const helpPrefs = {
    completedTours: ["comparativo", "orcamentos"],
    tourVersion: { comparativo: 1, orcamentos: 1 },
  };

  const stComp = getTourStatus(upgradedComparativo, helpPrefs);
  const stOrc = getTourStatus(orcamentos, helpPrefs);

  assert.strictEqual(stComp.completed, true);
  assert.strictEqual(stComp.outdated, true);
  assert.strictEqual(stComp.completedCurrent, false);

  assert.strictEqual(stOrc.completed, true);
  assert.strictEqual(stOrc.outdated, false);
  assert.strictEqual(stOrc.completedCurrent, true);
});

test("todos os alvos [data-tour=...] do tourRegistry existem nos componentes React", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const componentsDir = path.resolve(here, "../../components");
  const allJsx = fs
    .readdirSync(componentsDir)
    .filter((f) => f.endsWith(".jsx"))
    .map((f) => fs.readFileSync(path.join(componentsDir, f), "utf8"))
    .join("\n");

  for (const tour of TECO_TOURS) {
    for (const step of tour.steps) {
      const m = step.target.match(/^\[data-tour="([^"]+)"\]$/);
      assert.ok(m, `target inválido: ${step.target}`);
      assert.ok(
        allJsx.includes(`data-tour="${m[1]}"`),
        `data-tour="${m[1]}" do tour "${tour.id}" não encontrado nos componentes JSX`
      );
    }
  }
});
