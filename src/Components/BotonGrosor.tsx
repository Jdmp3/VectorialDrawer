import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const GROSORES = [0.1, 0.2, 0.3, 0];

export default function BotonGrosor() {
  const { grosorBorde, setGrosorBorde, mostrarPrompt } =
    useContext(LienzoContext);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!mostrarPrompt);
  }, [mostrarPrompt]);

  const handleToggle = () => {
    const indiceActual = GROSORES.indexOf(grosorBorde);
    const siguienteIndice = (indiceActual + 1) % GROSORES.length;
    setGrosorBorde(GROSORES[siguienteIndice]);
  };

  if (mostrarPrompt) return null;

  return (
    <div
      className={`fixed z-40 left-0 top-[96%] -translate-y-1/2 flex flex-col items-center gap-2 p-4 bg-zinc-800 rounded-r-lg transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        onClick={handleToggle}
        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
      >
        Toggle
      </button>
      <span className="text-white text-lg font-bold">{grosorBorde}</span>
    </div>
  );
}
