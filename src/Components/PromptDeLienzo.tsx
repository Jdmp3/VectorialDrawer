import { useContext } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const TAMANOS = [16, 32, 64, 128, 200, 256];

interface Propiedades {
  PromptText?: string;
  mostrarPrompt?: boolean;
  setMostrarPrompt?: (value: boolean) => void;
}

function Prompteador({
  PromptText = "Elija el tamaño de su lienzo",
  mostrarPrompt = true,
  setMostrarPrompt,
}: Propiedades) {
  const { tamano, setTamano } = useContext(LienzoContext);

  const handleCrear = () => {
    if (setMostrarPrompt) {
      setMostrarPrompt(false);
    }
  };

  return (
    <div
      className={`bg-sky-500 text-amber-50 mx-auto w-full max-w-md text-center p-6 sm:p-14 rounded-[20px] border-sky-800 border-6 transition-all duration-3500 ease-in-out z-50 ${
        mostrarPrompt ? "" : "translate-y-[200vh]"
      }`}
    >
      <div className="text-lg font-semibold mb-4">{PromptText}</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TAMANOS.map((t) => (
          <button
            key={t}
            onClick={() => setTamano(t)}
            className={`p-3 rounded text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tamano === t
                ? "bg-sky-700 border-2 border-amber-50 text-amber-50"
                : "bg-sky-600 hover:bg-sky-800 text-white"
            }`}
          >
            {t}x{t}
          </button>
        ))}
      </div>
      <div className="text-sm mb-4">
        Tamaño seleccionado:{" "}
        <span className="font-bold">
          {tamano}x{tamano}
        </span>
      </div>
      <button
        onClick={handleCrear}
        className="bg-sky-700 hover:bg-sky-800 text-white px-6 py-2 rounded font-medium"
      >
        Crear
      </button>
    </div>
  );
}

export default Prompteador;
