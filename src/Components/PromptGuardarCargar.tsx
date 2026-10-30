import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";
import { generarSVGMiniatura, miniaturaToDataURL } from "../utils/thumbnail";
import {
  borrarEspacio,
  DatosLienzo,
  inicializarEspacios,
  RegistroEspacio,
  guardarEspacio as guardarEnBackend,
} from "../services/canvasApi";

type DatosSlot = RegistroEspacio;

function mensajeError(error: unknown, fallback: string): string {
  const detalle = (error instanceof Error ? error.message : fallback).replace(/^Error:\s*/i, "");
  const sinServicios = detalle.replace(/\bGo\b|\bbase de datos\b|\bPostgreSQL?\b|\bS3\b|\bbucket\b/gi, "servicio");
  return `Error: ${sinServicios}`;
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
  onSaveSlot?: (elementos: VectorElement[]) => void;
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
  const [slotSeleccionado, setSlotSeleccionado] = useState<number | null>(null);
  const slotCursorRef = useRef<number | null>(null);
  const slotAntesDeCerrarRef = useRef<number | null>(null);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
  const [slots, setSlots] = useState<Array<DatosSlot | null>>([]);
  const [cargandoSlots, setCargandoSlots] = useState(true);
  const [operacion, setOperacion] = useState<"guardando" | "borrando" | "cargando" | null>(null);
  const [errorBackend, setErrorBackend] = useState("");
  const [avisoMigracion, setAvisoMigracion] = useState(false);
  const [expansion, setExpansion] = useState<{
    rect: DOMRect;
    targetRect: DOMRect;
    datos: DatosSlot;
    phase: "start" | "expand";
  } | null>(null);

  useEffect(() => {
    let activo = true;
    inicializarEspacios()
      .then((resultado) => {
        if (!activo) return;
        setSlots(resultado.espacios);
        setAvisoMigracion(resultado.conflictoMigracion);
        setErrorBackend("");
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setErrorBackend(
          mensajeError(error, "No se pudieron cargar los espacios.")
        );
      })
      .finally(() => {
        if (activo) setCargandoSlots(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const reintentarCarga = async () => {
    setCargandoSlots(true);
    try {
      const resultado = await inicializarEspacios();
      setSlots(resultado.espacios);
      setAvisoMigracion(resultado.conflictoMigracion);
      setErrorBackend("");
    } catch (error) {
      setErrorBackend(
        mensajeError(error, "No se pudieron cargar los espacios.")
      );
    } finally {
      setCargandoSlots(false);
    }
  };

  useEffect(() => {
    if (!mostrar) {
      setSlotSeleccionado(null);
      setConfirmandoBorrar(false);
      slotAntesDeCerrarRef.current = null;
    }
  }, [mostrar]);

  const guardarSlot = async (index: number): Promise<boolean> => {
    if (operacion) return false;
    const datos: DatosLienzo = {
      tamano,
      colorLienzo,
      elementos,
    };
    setOperacion("guardando");
    try {
      const guardado = await guardarEnBackend(index, datos);
      setSlots((actuales) => {
        const nuevos = [...actuales];
        nuevos[index] = guardado;
        return nuevos;
      });
      setErrorBackend("");
      onSaveSlot?.(guardado.elementos);
      return true;
    } catch (error) {
      setErrorBackend(
        mensajeError(error, "No se pudo guardar el lienzo.")
      );
      return false;
    } finally {
      setOperacion(null);
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

  const handleSlotClick = (_e: React.MouseEvent, index: number) => {
    slotCursorRef.current = index;
    setSlotSeleccionado(modo === "cargar" && !slots[index] ? null : index);
    setConfirmandoBorrar(false);
  };

  const handleBorrarClick = async () => {
    if (operacion || cargandoSlots) return;
    if (slotSeleccionado === null) return;
    const datos = slots[slotSeleccionado];
    if (!datos) return;

    if (confirmandoBorrar) {
      setOperacion("borrando");
      try {
        await borrarEspacio(slotSeleccionado);
        const siguientesSlots = slots
          .filter((slot, i) => i !== slotSeleccionado && slot !== null)
          .map((slot, espacio) => slot ? { ...slot, espacio } : null);
        const siguienteSeleccionado = modo === "guardar"
          ? slotSeleccionado
          : siguientesSlots.length > 0
            ? Math.min(slotSeleccionado, siguientesSlots.length - 1)
            : null;
        setSlots(siguientesSlots);
        setSlotSeleccionado(siguienteSeleccionado);
        slotCursorRef.current = siguienteSeleccionado;
        setConfirmandoBorrar(false);
        setErrorBackend("");
        if (siguienteSeleccionado !== null) {
          requestAnimationFrame(() => {
            const objetivo = document.querySelector<HTMLButtonElement>(`[data-slot-index="${siguienteSeleccionado}"]`);
            objetivo?.focus({ preventScroll: true });
            objetivo?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
      } catch (error) {
        setErrorBackend(
          mensajeError(error, "No se pudo borrar el lienzo.")
        );
      } finally {
        setOperacion(null);
      }
    } else {
      setConfirmandoBorrar(true);
    }
  };

  const handleGuardarCargarClick = async () => {
    if (slotSeleccionado === null || cargandoSlots || operacion) return;
    slotCursorRef.current = slotSeleccionado;

    if (modo === "guardar") {
      const guardado = await guardarSlot(slotSeleccionado);
      if (guardado) {
        setConfirmandoBorrar(false);
      }
    } else {
      const datos = slots[slotSeleccionado];
      if (!datos) return;
      const slotEl = document.querySelector(
        `[data-slot-index="${slotSeleccionado}"]`
      );
      const rect =
        slotEl?.getBoundingClientRect() ??
        new DOMRect(0, 0, 0, 0);
      const svgEl = document.querySelector("[data-lienzo-svg]");
      const targetRect =
        svgEl?.getBoundingClientRect() ??
        new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      iniciarExpansion(rect, targetRect, datos);
      setOperacion("cargando");
      setMostrar(false);
    }
  };

  useEffect(() => {
    if (!mostrar) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const elemento = target instanceof HTMLElement ? target : null;
      const esCampoEditable = Boolean(
        elemento &&
          (elemento.isContentEditable ||
            elemento.closest("input, textarea, select, [contenteditable='true']"))
      );
      if (event.key === "Escape") {
        event.preventDefault();
        setMostrar(false);
        setSlotSeleccionado(null);
        setConfirmandoBorrar(false);
        return;
      }
      if (esCampoEditable) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        if (!event.repeat) void handleBorrarClick();
        return;
      }

      if (event.key === "Enter") {
        const slotEnfocado = elemento?.closest("[data-slot-index]");
        const accionPrincipalEnfocada = elemento?.closest("[data-primary-action]");
        if (slotEnfocado || accionPrincipalEnfocada) {
          event.preventDefault();
          if (modo === "guardar" && slotSeleccionado !== null && !cargandoSlots) {
            const index = slotSeleccionado;
            slotCursorRef.current = index;
            void guardarSlot(index).then((guardado) => {
              if (guardado) {
                setConfirmandoBorrar(false);
              }
            });
          } else {
            void handleGuardarCargarClick();
          }
        }
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const cantidadAccesible = slots.length + (modo === "guardar" ? 1 : 0);
      const cantidadPosiciones = Math.max(9, cantidadAccesible);
      const disponible = (index: number) =>
        index < slots.length ? slots[index] !== null : modo === "guardar" && index === slots.length;
      const slotBase = slotSeleccionado ?? slotCursorRef.current;
      let siguiente: number | null = null;

      const botonCerrar = elemento?.closest("[data-close-button]");
      if (botonCerrar) {
        if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
          const primeraFila = [
            slotAntesDeCerrarRef.current,
            slotCursorRef.current,
            2,
            1,
            0,
          ].find((index): index is number => index !== null && disponible(index));
          if (primeraFila !== undefined) {
            siguiente = primeraFila;
            slotAntesDeCerrarRef.current = null;
          }
        }

        if (siguiente !== null) {
          setSlotSeleccionado(siguiente);
          slotCursorRef.current = siguiente;
          setConfirmandoBorrar(false);
          requestAnimationFrame(() => {
            const objetivo = document.querySelector<HTMLButtonElement>(`[data-slot-index="${siguiente}"]`);
            objetivo?.focus({ preventScroll: true });
            objetivo?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
        return;
      }

      if (
        event.key === "ArrowUp" &&
        slotBase !== null &&
        slotBase >= 0 &&
        slotBase < 3
      ) {
        slotAntesDeCerrarRef.current = slotBase;
        setSlotSeleccionado(null);
        setConfirmandoBorrar(false);
        requestAnimationFrame(() => {
          document.querySelector<HTMLButtonElement>("[data-close-button]")?.focus();
        });
        return;
      }

      if (slotBase === null) {
        const primeroDisponible = Array.from({ length: cantidadAccesible }, (_, index) => index)
          .find(disponible);
        if (primeroDisponible !== undefined) siguiente = primeroDisponible;
      } else {
        let fila = Math.floor(slotBase / 3);
        let columna = slotBase % 3;
        const [deltaFila, deltaColumna] =
          event.key === "ArrowUp"
            ? [-1, 0]
            : event.key === "ArrowDown"
              ? [1, 0]
              : event.key === "ArrowLeft"
                ? [0, -1]
                : [0, 1];

        while (true) {
          fila += deltaFila;
          columna += deltaColumna;
          if (fila < 0 || fila >= Math.ceil(cantidadPosiciones / 3) || columna < 0 || columna >= 3) break;
          const candidato = fila * 3 + columna;
          if (candidato >= cantidadPosiciones) break;
          if (disponible(candidato)) {
            siguiente = candidato;
            break;
          }
        }
      }

      if (siguiente !== null) {
        setSlotSeleccionado(siguiente);
        slotCursorRef.current = siguiente;
        setConfirmandoBorrar(false);
        requestAnimationFrame(() => {
          const objetivo = document.querySelector<HTMLButtonElement>(`[data-slot-index="${siguiente}"]`);
          objetivo?.focus({ preventScroll: true });
          objetivo?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mostrar,
    modo,
    slots,
    slotSeleccionado,
    cargandoSlots,
    handleGuardarCargarClick,
    handleBorrarClick,
    guardarSlot,
  ]);

  const colores =
    modo === "guardar"
      ? {
          bg: "bg-emerald-500",
          border: "border-emerald-800",
          headerText: "text-white",
          slotBg: "bg-emerald-600/60",
          slotHover: "hover:bg-emerald-400/80",
          slotSelected: "bg-emerald-300/80",
          slotText: "text-white",
          slotMuted: "text-emerald-100",
          btnBg: "bg-emerald-600",
          btnBorder: "border-emerald-800",
          text: "text-white",
          muted: "text-emerald-100",
        }
      : {
          bg: "bg-amber-400",
          border: "border-amber-700",
          headerText: "text-stone-800",
          slotBg: "bg-amber-700/80",
          slotHover: "hover:bg-amber-600/90",
          slotSelected: "bg-amber-500/90",
          slotText: "text-stone-100",
          slotMuted: "text-stone-100",
          btnBg: "bg-amber-600",
          btnBorder: "border-amber-800",
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
            setSlotSeleccionado(null);
            setConfirmandoBorrar(false);
          }}
        />
      )}

      <div
        className={`save-load-prompt fixed left-1/2 -translate-x-1/2 mx-auto w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden ${colores.bg} ${colores.text} p-6 sm:p-8 rounded-[20px] ${colores.border} border-6 transition-all ease-in-out z-[56] ${
          mostrar
            ? "top-1/2 -translate-y-1/2 duration-[300ms]"
            : "top-1/2 translate-y-[-200vh] duration-[300ms]"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl sm:text-2xl font-bold ${colores.headerText}`}>
            {modo === "guardar" ? "Guardar lienzo" : "Cargar lienzo"}
          </h2>
          <button
            data-close-button
            onClick={() => {
              setMostrar(false);
              setSlotSeleccionado(null);
              setConfirmandoBorrar(false);
            }}
            className={`p-1 rounded-lg ${colores.slotHover} transition-colors focus-visible:ring-2 focus-visible:ring-white/80`}
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

        {(errorBackend || avisoMigracion) && (
          <div
            role="alert"
            className={`mb-3 rounded-lg px-3 py-2 text-sm ${
              errorBackend
                ? "bg-rose-800/90 text-white"
                : "bg-amber-100 text-amber-950"
            }`}
          >
            {errorBackend ||
              "Hay lienzos antiguos en este navegador y la base ya contiene datos. No se sobrescribieron; los datos del navegador siguen allí."}
            {errorBackend && (
              <button
                type="button"
                onClick={reintentarCarga}
                disabled={cargandoSlots}
                className="ml-2 underline underline-offset-2 disabled:opacity-60"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {(cargandoSlots || operacion) && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-black/15 px-3 py-2 text-sm" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <span>
              Cargando
            </span>
          </div>
        )}

        <div
          className={`save-load-slots grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 p-2 max-h-[60dvh] ${slots.length + (modo === "guardar" ? 1 : 0) > 9 ? "overflow-y-scroll" : "overflow-y-hidden"} overscroll-contain`}
          aria-busy={cargandoSlots || operacion !== null}
          aria-label={modo === "guardar" ? "Lienzos guardados y espacio nuevo" : "Lienzos guardados"}
        >
          {Array.from({ length: Math.max(9, slots.length + (modo === "guardar" ? 1 : 0)) }, (_, i) => {
            const datos = slots[i] ?? null;
            const ocupado = datos !== null;
            const espacioNuevo = modo === "guardar" && i === slots.length;

            if (!ocupado && !espacioNuevo) {
              return <div key={`vacio-${i}`} className="canvas-slot-empty aspect-square rounded-lg bg-zinc-950/70 border border-zinc-700/70" aria-hidden="true" />;
            }

            return (
              <button
                key={i}
                type="button"
                onClick={(e) => handleSlotClick(e, i)}
                data-slot-index={i}
                aria-pressed={slotSeleccionado === i}
                className={`relative rounded-lg overflow-hidden transition-all duration-200 ease-in-out ${colores.slotBg} ${colores.slotHover} ${slotSeleccionado === i ? `${colores.slotSelected} ring-2 ring-white/80 scale-[1.04] shadow-lg shadow-black/30` : ""} p-1.5 flex flex-col items-center cursor-pointer`}
              >
                <div className={`canvas-slot-preview w-full aspect-square rounded overflow-hidden mb-0.5 ${ocupado ? "bg-black/20" : "bg-black/25"}`}>
                  {ocupado ? (
                    <img
                      src={miniaturaToDataURL(generarSVGMiniatura(datos.tamano, datos.colorLienzo, datos.elementos, 80))}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${colores.slotMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium ${colores.slotText} leading-tight`}>
                  {ocupado ? `${datos.tamano}x${datos.tamano}` : "Guardar nuevo"}
                </span>
                {ocupado && <span className={`text-[8px] sm:text-[10px] ${colores.slotMuted} leading-tight`}>{formatearFecha(datos.guardadoEn)}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleGuardarCargarClick}
            data-primary-action
            disabled={slotSeleccionado === null || cargandoSlots || operacion !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2 ${
              slotSeleccionado !== null
                ? `${colores.btnBg} hover:brightness-110 text-white ${colores.btnBorder}`
                : "bg-stone-600 text-stone-400 border-stone-700 cursor-not-allowed"
            }`}
          >
            {modo === "guardar" ? (
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            ) : (
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            )}
            {operacion ? "Cargando" : modo === "guardar" ? "Guardar" : "Cargar"}
          </button>
          <button
            onClick={handleBorrarClick}
            disabled={slotSeleccionado === null || !slots[slotSeleccionado] || cargandoSlots || operacion !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2 ${
              confirmandoBorrar
                ? "bg-rose-400 text-white border-rose-200 shadow-lg shadow-rose-500/40"
                : slotSeleccionado !== null && slots[slotSeleccionado]
                  ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-500 hover:border-rose-300"
                  : "bg-rose-800/50 text-rose-400/50 border-rose-800/50 cursor-not-allowed"
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
            {confirmandoBorrar ? "¿Seguro?" : "Borrar"}
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
              setOperacion(null);
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-sm font-medium text-white" role="status">
            <span className="loading-spinner mr-2" aria-hidden="true" />
            Cargando
          </div>
        </div>
      )}
    </>
  );
}

export default PromptGuardarCargar;
