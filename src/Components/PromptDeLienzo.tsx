import { useContext, useState } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const MIN_DIMENSION = 16;
const MAX_DIMENSION = 4096;

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
  const [errorAncho, setErrorAncho] = useState<string | null>(null);
  const [errorAlto, setErrorAlto] = useState<string | null>(null);

  const validarDimension = (valor: number): string | null => {
    if (isNaN(valor)) return "Debe ser un número válido";
    if (valor < MIN_DIMENSION) return `Mínimo ${MIN_DIMENSION}px`;
    if (valor > MAX_DIMENSION) return `Máximo ${MAX_DIMENSION}px`;
    return null;
  };

  const handleAnchoChange = (value: number) => {
    setAncho(value);
    setErrorAncho(validarDimension(value));
  };

  const handleAltoChange = (value: number) => {
    setAlto(value);
    setErrorAlto(validarDimension(value));
  };

  const handleCrear = () => {
    const errorA = validarDimension(ancho);
    const errorAL = validarDimension(alto);
    setErrorAncho(errorA);
    setErrorAlto(errorAL);

    if (!errorA && !errorAL && setMostrarPrompt) {
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
            min={0}
            value={ancho}
            onChange={(e) => handleAnchoChange(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="ml-2 text-black rounded px-1 w-20 bg-white"
          />
        </label>
        {errorAncho && <span className="text-red-200 text-xs">{errorAncho}</span>}
        <label className="text-sm">
          Alto:
          <input
            type="number"
            min={0}
            value={alto}
            onChange={(e) => handleAltoChange(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="ml-2 text-black rounded px-1 w-20 bg-white"
          />
        </label>
        {errorAlto && <span className="text-red-200 text-xs">{errorAlto}</span>}
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
