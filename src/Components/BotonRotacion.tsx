import { useContext } from "react";
import { LienzoContext } from "./ContextDeLienzo";

function BotonRotacion() {
  const { selectedElementId, elementos, actualizarElemento, herramientaActual } =
    useContext(LienzoContext);

  if (herramientaActual !== "seleccionar" || !selectedElementId) return null;

  const el = elementos.find((e) => e.id === selectedElementId);
  if (!el || el.tipo !== "rectangulo") return null;

  const handleRotar = () => {
    actualizarElemento(el.id, { ...el, degres: el.degres + 45 });
  };

  return (
    <button
      onClick={handleRotar}
      className="fixed bottom-4 right-4 px-4 py-2 rounded-lg font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors z-50 shadow-lg"
    >
      ↻ 45°
    </button>
  );
}

export default BotonRotacion;
