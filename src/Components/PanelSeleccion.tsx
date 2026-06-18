import { useContext } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";

function PanelSeleccion() {
  const {
    herramientaActual,
    selectedElementId,
    multiSelectedIds,
    elementos,
    mostrarPrompt,
    mostrarPromptGuardarCargar,
    clipboardElements,
    setClipboardElements,
    setElementos,
    setMultiSelectedIds,
    setSelectedElementId,
  } = useContext(LienzoContext);

  if (herramientaActual !== "seleccionar" || mostrarPrompt || mostrarPromptGuardarCargar) return null;

  const idsActivos = multiSelectedIds.length > 0
    ? multiSelectedIds
    : selectedElementId
      ? [selectedElementId]
      : [];
  const elementosSeleccionados = elementos.filter(el => idsActivos.includes(el.id));
  const haySeleccion = elementosSeleccionados.length > 0;
  const hayClipboard = clipboardElements.length > 0;

  if (!haySeleccion && !hayClipboard) return null;

  const handleCopiar = () => {
    setClipboardElements(elementosSeleccionados.map(el => ({ ...el })));
  };

  const handlePegar = () => {
    if (clipboardElements.length === 0) return;

    const nuevos = clipboardElements.map(el => {
      const clon = JSON.parse(JSON.stringify(el)) as VectorElement;
      clon.id = crypto.randomUUID();
      switch (clon.tipo) {
        case "linea":
          clon.x1 += 20;
          clon.x2 += 20;
          break;
        case "rectangulo":
        case "imagen":
          clon.x += 20;
          break;
        case "circulo":
          clon.cx += 20;
          break;
      }
      return clon;
    });

    setElementos([...elementos, ...nuevos]);
    setSelectedElementId(null);
    setMultiSelectedIds(nuevos.map(el => el.id));
  };

  return (
    <div className="fixed right-40 top-20 bg-zinc-900 p-4 rounded-xl shadow-lg z-50 flex flex-col gap-3">
      <div className="flex gap-2">
        {haySeleccion && (
          <button
            onClick={handleCopiar}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          >
            Copiar
          </button>
        )}
        {hayClipboard && (
          <button
            onClick={handlePegar}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          >
            Pegar
          </button>
        )}
      </div>
    </div>
  );
}

export default PanelSeleccion;
