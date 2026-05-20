import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

function PanelLapiz() {
  const { herramientaActual, mostrarPrompt, colorLapiz, setColorLapiz, grosorLapiz, setGrosorLapiz } =
    useContext(LienzoContext);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mostrarPrompt) {
      setVisible(true);
    }
  }, [mostrarPrompt]);

  if (herramientaActual !== "lapiz") {
    return null;
  }

  return (
    <div
      className={`fixed right-28 top-4 bg-zinc-900 p-4 rounded-xl shadow-lg z-50 flex flex-col gap-3 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <label className="text-zinc-300 text-sm font-medium">Color:</label>
        <input
          type="color"
          value={colorLapiz}
          onChange={(e) => setColorLapiz(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-zinc-300 text-sm font-medium">Grosor:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={grosorLapiz}
          onChange={(e) => setGrosorLapiz(Number(e.target.value))}
          className="w-32 cursor-pointer"
        />
        <span className="text-zinc-400 text-sm w-6">{grosorLapiz}</span>
      </div>
    </div>
  );
}

export default PanelLapiz;