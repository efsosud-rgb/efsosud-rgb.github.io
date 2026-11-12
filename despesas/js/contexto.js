/** Dados e ações compartilhados entre as telas (mês escolhido, folhas abertas, avisos). */

import { createContext, useContext } from '../vendor/preact-htm-3.1.1.module.js';

export const Contexto = createContext(/** @type {any} */ (null));

/** @returns {any} */
export function useApp() {
  return useContext(Contexto);
}
