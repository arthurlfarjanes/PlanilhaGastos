import { motionValue } from "motion/react";

/**
 * Estado compartilhado entre as seções DOM e a cena 3D fixa.
 * - steps: progresso (0..1) da seção "Como funciona" (controla o morph cartão → moedas → barras)
 */
export const sceneStore = {
  steps: motionValue(0),
};
