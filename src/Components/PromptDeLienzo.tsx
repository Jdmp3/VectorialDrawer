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
  const { tamano, setTamano, colorLienzo, setColorLienzo } = useContext(LienzoContext);

  const handleCrear = () => {
    if (setMostrarPrompt) {
      setMostrarPrompt(false);
    }
  };

  return (
    <div
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500 text-amber-50 mx-auto w-full max-w-md text-center p-6 sm:p-14 rounded-[20px] border-sky-800 border-6 transition-all duration-3500 ease-in-out z-50 ${
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
      <div className="mb-4">
        <label className="text-sm text-amber-50 block mb-2">Color del lienzo:</label>
        <div className="bg-sky-600 hover:bg-sky-800 text-white p-3 rounded text-sm font-medium cursor-pointer inline-block">
          <input
            type="color"
            value={colorLienzo}
            onChange={(e) => setColorLienzo(e.target.value)}
            className="w-8 h-8 cursor-pointer border-0 p-0 bg-transparent"
          />
        </div>
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
