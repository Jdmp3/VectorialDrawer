import { useContext } from "react";
import { LienzoContext } from "./ContextDeLienzo";

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
  const { ancho, alto, setAncho, setAlto } = useContext(LienzoContext);

  const handleCrear = () => {
    if (setMostrarPrompt) {
      setMostrarPrompt(false);
    }
  };

  return (
    <div
      className={`bg-sky-500 text-amber-50 mx-auto w-64 text-center p-14 rounded-[20px] border-sky-800 border-6 transition-all duration-3500 ease-in-out ${
        mostrarPrompt ? "" : "translate-y-[200vh]"
      }`}
    >
      {PromptText}
      <div className="mt-2 flex flex-col gap-2">
        <label className="text-sm">
          Ancho:
          <input
            type="number"
            value={ancho}
            onChange={(e) => setAncho(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="ml-2 text-black rounded px-1 w-20 bg-white"
          />
        </label>
        <label className="text-sm">
          Alto:
          <input
            type="number"
            value={alto}
            onChange={(e) => setAlto(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="ml-2 text-black rounded px-1 w-20 bg-white"
          />
        </label>
      </div>
      <button
        onClick={handleCrear}
        className="mt-4 bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded"
      >
        Crear
      </button>
    </div>
  );
}

export default Prompteador;
