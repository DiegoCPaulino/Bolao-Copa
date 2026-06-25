// Os rótulos de fase/estado agora moram em `shared/` (fonte única reusada por CLI e
// HTTP). Mantemos este re-export para os menus seguirem importando de `../rotulos.js`.
export { ESTADO_LABEL, FASE_LABEL } from "../shared/rotulos.js";
