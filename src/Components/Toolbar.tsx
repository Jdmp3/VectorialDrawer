import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

function Toolbar() {
  const { herramientaActual, setHerramientaActual, clearElementos, mostrarPrompt } =
    useContext(LienzoContext);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mostrarPrompt) {
      setVisible(true);
    }
  }, [mostrarPrompt]);

  const handleMoverClick = () => {
    setHerramientaActual("mover");
  };

  const handleFigurasClick = () => {
    setHerramientaActual("figuras");
  };

  const handleLimpiarClick = () => {
    clearElementos();
  };

  return (
    <div
      className={`fixed right-4 top-4 flex flex-col gap-2 bg-zinc-900 p-3 rounded-xl shadow-lg z-50 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        onClick={handleMoverClick}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          herramientaActual === "mover"
            ? "bg-blue-600 text-white"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
        }`}
      >
        Mover
      </button>
      <button
        onClick={() => setHerramientaActual("seleccionar")}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          herramientaActual === "seleccionar"
            ? "bg-blue-600 text-white"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
        }`}
      >
        Seleccionar
      </button>
      <button
        onClick={handleFigurasClick}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          herramientaActual === "figuras"
            ? "bg-blue-600 text-white"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
        }`}
      >
        Figuras
      </button>
      <button
        onClick={handleLimpiarClick}
        className="px-4 py-2 rounded-lg font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
      >
        Limpiar
      </button>
    </div>
  );
}

export default Toolbar;
