import { useContext } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";

function PanelSeleccion() {
  const {
    herramientaActual,
    selectedElementId,
    elementos,
    clipboardElement,
    setClipboardElement,
    addElemento,
  } = useContext(LienzoContext);

  if (herramientaActual !== "seleccionar" || !selectedElementId) {
    return null;
  }

  const elementoSeleccionado = elementos.find(el => el.id === selectedElementId);
  if (!elementoSeleccionado) return null;

  const handleCopiar = () => {
    setClipboardElement(elementoSeleccionado);
  };

  const handlePegar = () => {
    if (!clipboardElement) return;

    const nuevoElemento = JSON.parse(JSON.stringify(clipboardElement)) as VectorElement;
    nuevoElemento.id = crypto.randomUUID();

    switch (nuevoElemento.tipo) {
      case "linea":
        nuevoElemento.x1 += 20;
        nuevoElemento.y1 += 20;
        nuevoElemento.x2 += 20;
        nuevoElemento.y2 += 20;
        break;
      case "rectangulo":
      case "imagen":
        nuevoElemento.x += 20;
        nuevoElemento.y += 20;
        break;
      case "circulo":
        nuevoElemento.cx += 20;
        nuevoElemento.cy += 20;
        break;
    }

    addElemento(nuevoElemento);
  };

  const botonClase = (tipo: "copiar" | "pegar") =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      tipo === "pegar" && !clipboardElement
        ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
    }`;

  return (
    <div className="fixed right-40 top-20 bg-zinc-900 p-4 rounded-xl shadow-lg z-50 flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          className={botonClase("copiar")}
          onClick={handleCopiar}
        >
          Copiar
        </button>
        <button
          className={botonClase("pegar")}
          onClick={handlePegar}
          disabled={!clipboardElement}
        >
          Pegar
        </button>
      </div>
    </div>
  );
}

export default PanelSeleccion;
