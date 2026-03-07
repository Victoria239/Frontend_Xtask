/* Entry point de la aplicación */

/*
 * Parche DOM: React 19 + MUI v5 Dialogs/Transitions pueden causar
 * "Failed to execute 'removeChild'/'insertBefore' on 'Node'" cuando
 * React intenta manipular nodos que MUI ya movió/eliminó durante las
 * transiciones. Interceptamos esas operaciones y silenciamos el error
 * específico para que la UI no se rompa.
 */
const origRemoveChild = Node.prototype.removeChild;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    console.warn("removeChild: nodo ya no es hijo, ignorado", child);
    return child;
  }
  return origRemoveChild.call(this, child) as T;
};

const origInsertBefore = Node.prototype.insertBefore;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Node.prototype.insertBefore = function <T extends Node>(node: T, ref: Node | null): T {
  if (ref && ref.parentNode !== this) {
    console.warn("insertBefore: nodo referencia ya no es hijo, ignorado", ref);
    return node;
  }
  return origInsertBefore.call(this, node, ref) as T;
};

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
