import { useContext, useEffect, useCallback } from "react";
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

  const handleCrear = useCallback(() => {
    if (setMostrarPrompt) {
      setMostrarPrompt(false);
    }
  }, [setMostrarPrompt]);

  useEffect(() => {
    if (!mostrarPrompt) return;

    const enfocar = (selector: string) => {
      document.querySelector<HTMLElement>(selector)?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleCrear();
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      const target = event.target;
      const elemento = target instanceof HTMLElement ? target : null;
      const botonTalla = elemento?.closest<HTMLButtonElement>("[data-size-index]");

      event.preventDefault();
      const indiceActual = botonTalla
        ? Number(botonTalla.dataset.sizeIndex)
        : Math.max(0, TAMANOS.indexOf(tamano));
      let indiceSiguiente: number | null = null;

      if (event.key === "ArrowUp") {
        if (indiceActual >= 3) indiceSiguiente = indiceActual - 3;
      } else if (event.key === "ArrowDown") {
        if (indiceActual < 3) indiceSiguiente = indiceActual + 3;
      } else if (event.key === "ArrowLeft") {
        if (indiceActual % 3 > 0) indiceSiguiente = indiceActual - 1;
      } else if (event.key === "ArrowRight") {
        if (indiceActual % 3 < 2) indiceSiguiente = indiceActual + 1;
      }

      if (indiceSiguiente !== null) {
        setTamano(TAMANOS[indiceSiguiente]);
        enfocar(`[data-size-index='${indiceSiguiente}']`);
      } else if (!botonTalla) {
        enfocar(`[data-size-index='${indiceActual}']`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mostrarPrompt, tamano, setTamano, handleCrear]);

  return (
    <div
      className={`canvas-prompt fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500 text-amber-50 mx-auto w-full max-w-md text-center p-6 sm:p-14 rounded-[20px] border-sky-800 border-6 transition-all ease-in-out z-50 ${
        mostrarPrompt ? "duration-[300ms]" : "duration-[3500ms] translate-y-[200vh]"
      }`}
    >
      <div className="text-lg font-semibold mb-4">{PromptText}</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TAMANOS.map((t) => (
          <button
            key={t}
            data-size-index={TAMANOS.indexOf(t)}
            onClick={() => setTamano(t)}
            className={`p-3 rounded text-sm font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-50 ${
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
            data-create-control="color"
            type="color"
            value={colorLienzo}
            onChange={(e) => setColorLienzo(e.target.value)}
            className="w-8 h-8 cursor-pointer border-0 p-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-50"
          />
        </div>
      </div>
      <button
        data-create-control="create"
        onClick={handleCrear}
        className="bg-sky-700 hover:bg-sky-800 text-white px-6 py-2 rounded font-medium focus-visible:ring-2 focus-visible:ring-amber-50"
      >
        Crear
      </button>
    </div>
  );
}

export default Prompteador;
