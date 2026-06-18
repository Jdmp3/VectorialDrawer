import { useContext, useState, useEffect } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";
import { generarSVGMiniatura, miniaturaToDataURL } from "../utils/thumbnail";

interface DatosSlot {
  tamano: number;
  colorLienzo: string;
  elementos: VectorElement[];
  guardadoEn: string;
}

interface Propiedades {
  mostrar: boolean;
  setMostrar: (v: boolean) => void;
  modo: "guardar" | "cargar";
  onLoadCanvas: (datos: {
    tamano: number;
    colorLienzo: string;
    elementos: VectorElement[];
  }) => void;
  onSaveSlot?: () => void;
}

function leerSlot(index: number): DatosSlot | null {
  try {
    const raw = localStorage.getItem(`vectorial_slot_${index}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${hh}:${mm}`;
}

function PromptGuardarCargar({
  mostrar,
  setMostrar,
  modo,
  onLoadCanvas,
  onSaveSlot,
}: Propiedades) {
  const { tamano, colorLienzo, elementos } = useContext(LienzoContext);
  const [modoBorrar, setModoBorrar] = useState(false);
  const [slotAParaBorrar, setSlotAParaBorrar] = useState<number | null>(null);
  const [, setSlotsActualizados] = useState(0);
  const [expansion, setExpansion] = useState<{
    rect: DOMRect;
    targetRect: DOMRect;
    datos: DatosSlot;
    phase: "start" | "expand";
  } | null>(null);

  useEffect(() => {
    if (!mostrar) {
      setModoBorrar(false);
      setSlotAParaBorrar(null);
    }
  }, [mostrar]);

  const triggerRender = () => setSlotsActualizados((s) => s + 1);

  const guardarSlot = (index: number) => {
    const datos: DatosSlot = {
      tamano,
      colorLienzo,
      elementos,
      guardadoEn: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`vectorial_slot_${index}`, JSON.stringify(datos));
      onSaveSlot?.();
      triggerRender();
    } catch {
      alert(
        "No hay suficiente espacio de almacenamiento para guardar este lienzo."
      );
    }
  };

  const iniciarExpansion = (rect: DOMRect, targetRect: DOMRect, datos: DatosSlot) => {
    setExpansion({ rect, targetRect, datos, phase: "start" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setExpansion((prev) =>
          prev ? { ...prev, phase: "expand" } : null
        );
      });
    });
  };

  const handleSlotClick = (e: React.MouseEvent, index: number) => {
    if (modoBorrar) {
      if (slotAParaBorrar === null) {
        const datos = leerSlot(index);
        if (datos) {
          setSlotAParaBorrar(index);
        } else {
          setModoBorrar(false);
        }
      } else {
        setModoBorrar(false);
        setSlotAParaBorrar(null);
      }
      return;
    }

    if (modo === "guardar") {
      guardarSlot(index);
      return;
    }

    if (modo === "cargar") {
      const datos = leerSlot(index);
      if (!datos) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const svgEl = document.querySelector("[data-lienzo-svg]");
      const targetRect = svgEl?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      iniciarExpansion(rect, targetRect, datos);
      setMostrar(false);
    }
  };

  const handleBorrarClick = () => {
    if (slotAParaBorrar !== null) {
      localStorage.removeItem(`vectorial_slot_${slotAParaBorrar}`);
      setModoBorrar(false);
      setSlotAParaBorrar(null);
      triggerRender();
    } else {
      setModoBorrar(!modoBorrar);
    }
  };

  const colores =
    modo === "guardar"
      ? {
          bg: "bg-emerald-500",
          border: "border-emerald-800",
          headerText: "text-white",
          slotBg: "bg-emerald-600/60",
          slotHover: "hover:bg-emerald-400/80",
          text: "text-white",
          muted: "text-emerald-100",
        }
      : {
          bg: "bg-amber-400",
          border: "border-amber-700",
          headerText: "text-stone-800",
          slotBg: "bg-amber-500/60",
          slotHover: "hover:bg-amber-300/80",
          text: "text-stone-800",
          muted: "text-stone-600",
        };

  return (
    <>
      {mostrar && (
        <div
          className="fixed inset-0 bg-black/50 z-[55]"
          onClick={() => {
            setMostrar(false);
            setModoBorrar(false);
            setSlotAParaBorrar(null);
          }}
        />
      )}

      <div
        className={`fixed left-1/2 -translate-x-1/2 mx-auto w-full max-w-md ${colores.bg} ${colores.text} p-6 sm:p-8 rounded-[20px] ${colores.border} border-6 transition-all ease-in-out z-[56] ${
          mostrar
            ? "top-1/2 -translate-y-1/2 duration-[300ms]"
            : "top-1/2 translate-y-[-200vh] duration-[300ms]"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base sm:text-lg font-bold ${colores.headerText}`}>
            {modo === "guardar" ? "Guardar lienzo" : "Cargar lienzo"}
          </h2>
          <button
            onClick={() => {
              setMostrar(false);
              setModoBorrar(false);
              setSlotAParaBorrar(null);
            }}
            className={`p-1 rounded-lg ${colores.slotHover} transition-colors`}
          >
            <svg
              className={`w-5 h-5 sm:w-6 sm:h-6 ${colores.text}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
          {Array.from({ length: 9 }, (_, i) => {
            const datos = leerSlot(i);
            const ocupado = datos !== null;

            return (
              <button
                key={i}
                onClick={(e) => handleSlotClick(e, i)}
              disabled={false}
                className={`relative rounded-lg overflow-hidden transition-all duration-200 ease-in-out 
                    ${colores.slotBg} ${colores.slotHover}
                    ${
                      modo === "cargar" && !ocupado ? "opacity-50" : ""
                    }
                    ${
                      modo === "cargar" && !ocupado && !modoBorrar
                        ? "cursor-not-allowed hover:scale-100 hover:shadow-none"
                        : "cursor-pointer hover:scale-[1.04] hover:shadow-lg hover:shadow-black/30"
                    }
                    p-1.5 flex flex-col items-center
                  `}
              >
                <div className="w-full aspect-square rounded overflow-hidden mb-0.5 bg-black/20">
                  {ocupado ? (
                    <img
                      src={miniaturaToDataURL(
                        generarSVGMiniatura(
                          datos.tamano,
                          datos.colorLienzo,
                          datos.elementos,
                          80
                        )
                      )}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${colores.muted}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium ${colores.text} leading-tight`}
                >
                  {ocupado
                    ? `${datos.tamano}x${datos.tamano}`
                    : "Vacío"}
                </span>
                {ocupado && (
                  <span
                    className={`text-[8px] sm:text-[10px] ${colores.muted} leading-tight`}
                  >
                    {formatearFecha(datos.guardadoEn)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleBorrarClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2 ${
              slotAParaBorrar !== null
                ? "bg-rose-400 text-white border-rose-200 shadow-lg shadow-rose-500/40"
                : modoBorrar
                  ? "bg-rose-800 text-white border-rose-700"
                  : "bg-rose-600 text-white border-rose-600 hover:bg-rose-500 hover:border-rose-300"
            }`}
          >
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {slotAParaBorrar !== null ? "¿Seguro?" : "Borrar"}
          </button>
        </div>
      </div>

      {expansion && (
        <div
          className="fixed z-[100] overflow-hidden"
          style={{
            top: expansion.phase === "start" ? expansion.rect.top : expansion.targetRect.top,
            left: expansion.phase === "start" ? expansion.rect.left : expansion.targetRect.left,
            width: expansion.phase === "start" ? expansion.rect.width : expansion.targetRect.width,
            height: expansion.phase === "start" ? expansion.rect.height : expansion.targetRect.height,
            transition: "all 500ms ease-in-out",
            backgroundColor: expansion.datos.colorLienzo,
          }}
          onTransitionEnd={() => {
            if (expansion.phase === "expand") {
              onLoadCanvas({
                tamano: expansion.datos.tamano,
                colorLienzo: expansion.datos.colorLienzo,
                elementos: expansion.datos.elementos,
              });
              setExpansion(null);
              setMostrar(false);
            }
          }}
        >
          <img
            src={miniaturaToDataURL(
              generarSVGMiniatura(
                expansion.datos.tamano,
                expansion.datos.colorLienzo,
                expansion.datos.elementos,
                expansion.targetRect.width
              )
            )}
            className="w-full h-full object-contain"
            alt=""
          />
        </div>
      )}
    </>
  );
}

export default PromptGuardarCargar;
