import { useState, useEffect, useRef, useCallback } from "react";
import Prompteador from "./Components/PromptDeLienzo";
import AnimacionMorphing from "./Components/AnimacionMorphing";
import PromptGuardarCargar from "./Components/PromptGuardarCargar";
import PromptAdvertenciaCambios from "./Components/PromptAdvertenciaCambios";
import Lienzo from "./Components/Lienzo";
import ZoomBar from "./Components/ZoomBar";
import BotonGrosor from "./Components/BotonGrosor";
import Toolbar from "./Components/Toolbar";
import PanelFiguras from "./Components/PanelFiguras";
import PanelSeleccion from "./Components/PanelSeleccion";
import MenuHamburguesa from "./Components/MenuHamburguesa";
import { LienzoContext, VectorElement } from "./Components/ContextDeLienzo";

const CONSULTA_MOVIL_VERTICAL = "(max-width: 767px) and (orientation: portrait)";

function App() {
  const [tamano, setTamano] = useState(16);
  const [colorLienzo, setColorLienzo] = useState("#3d3d3d");
  const [mostrarPrompt, setMostrarPrompt] = useState(true);
  const [mostrarPromptGuardarCargar, setMostrarPromptGuardarCargar] = useState(false);
  const [modoPrompt, setModoPrompt] = useState<"guardar" | "cargar">("guardar");
  const [offsetReal, setOffsetReal] = useState({ x: 0, y: 0 });
  const [offsetRender, setOffsetRender] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [grosorBorde, setGrosorBorde] = useState(0.1);
  const [herramientaActual, setHerramientaActual] = useState<"figuras" | "mover" | "seleccionar">("mover");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [figuraTipo, setFiguraTipo] = useState<"linea" | "rectangulo" | "circulo" | "imagen">("linea");
  const [colorFigura, setColorFigura] = useState("#000000");
  const [grosorFigura, setGrosorFigura] = useState(2);
  const [imagenCargada, setImagenCargada] = useState<{
    src: string;
    storageKey: string;
  } | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [clipboardElements, setClipboardElements] = useState<VectorElement[]>([]);
  const [elementos, setElementos] = useState<VectorElement[]>([]);
  const [elementosGuardados, setElementosGuardados] = useState<VectorElement[]>([]);
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [requiereOrientacionHorizontal, setRequiereOrientacionHorizontal] = useState(
    () => typeof window !== "undefined" && window.matchMedia(CONSULTA_MOVIL_VERTICAL).matches,
  );
  const [accionPendiente, setAccionPendiente] = useState<(() => void) | null>(null);
  const accionPendienteRef = useRef<(() => void) | null>(null);
  accionPendienteRef.current = accionPendiente;

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_MOVIL_VERTICAL);
    const actualizarOrientacion = () => {
      setRequiereOrientacionHorizontal(consulta.matches);
    };

    actualizarOrientacion();
    consulta.addEventListener("change", actualizarOrientacion);
    window.addEventListener("resize", actualizarOrientacion);
    return () => {
      consulta.removeEventListener("change", actualizarOrientacion);
      window.removeEventListener("resize", actualizarOrientacion);
    };
  }, []);

  const crearNuevoLienzo = useCallback(() => {
    const hayCambiosNoGuardados =
      elementos.length > 0 &&
      JSON.stringify(elementos) !== JSON.stringify(elementosGuardados);
    const iniciarLienzoNuevo = () => {
      setMostrarPrompt(true);
      setElementos([]);
      setSelectedElementId(null);
      setMultiSelectedIds([]);
      setHerramientaActual("seleccionar");
    };

    if (hayCambiosNoGuardados) {
      setAccionPendiente(() => iniciarLienzoNuevo);
      setMostrarAdvertencia(true);
    } else {
      iniciarLienzoNuevo();
    }
  }, [elementos, elementosGuardados]);

  const abrirGuardarLienzo = useCallback(() => {
    setModoPrompt("guardar");
    setMostrarPromptGuardarCargar(true);
  }, []);

  const abrirCargarLienzo = useCallback(() => {
    const hayCambiosNoGuardados =
      elementos.length > 0 &&
      JSON.stringify(elementos) !== JSON.stringify(elementosGuardados);
    const mostrarMenuCarga = () => {
      setModoPrompt("cargar");
      setMostrarPromptGuardarCargar(true);
    };

    if (hayCambiosNoGuardados) {
      setAccionPendiente(() => mostrarMenuCarga);
      setMostrarAdvertencia(true);
    } else {
      mostrarMenuCarga();
    }
  }, [elementos, elementosGuardados]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const esCampoEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"));

      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        esCampoEditable ||
        mostrarPrompt ||
        mostrarPromptGuardarCargar ||
        mostrarAdvertencia ||
        requiereOrientacionHorizontal
      ) {
        return;
      }

      const tecla = event.key.toLowerCase();
      if (!["n", "c", "g"].includes(tecla)) return;

      event.preventDefault();
      if (tecla === "n") crearNuevoLienzo();
      if (tecla === "c") abrirCargarLienzo();
      if (tecla === "g") abrirGuardarLienzo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mostrarPrompt,
    mostrarPromptGuardarCargar,
    mostrarAdvertencia,
    requiereOrientacionHorizontal,
    crearNuevoLienzo,
    abrirCargarLienzo,
    abrirGuardarLienzo,
  ]);

  useEffect(() => {
    if (herramientaActual !== "seleccionar") {
      setSelectedElementId(null);
      setMultiSelectedIds([]);
    }
  }, [herramientaActual]);

  useEffect(() => {
    if (!mostrarPrompt && !mostrarPromptGuardarCargar) {
      setHerramientaActual("seleccionar");
    }
  }, [mostrarPrompt, mostrarPromptGuardarCargar]);

  useEffect(() => {
    if (!mostrarPromptGuardarCargar && accionPendienteRef.current) {
      accionPendienteRef.current();
      accionPendienteRef.current = null;
      setAccionPendiente(null);
    }
  }, [mostrarPromptGuardarCargar]);

  const addElemento = (el: VectorElement) => {
    setElementos([...elementos, el]);
  };

  const actualizarElemento = (id: string, elemento: VectorElement) => {
    setElementos(prev => prev.map(el => el.id === id ? elemento : el));
  };

  const clearElementos = () => {
    if (herramientaActual === "seleccionar" && multiSelectedIds.length > 0) {
      setElementos(elementos.filter(el => !multiSelectedIds.includes(el.id)));
      setMultiSelectedIds([]);
    } else if (herramientaActual === "seleccionar" && selectedElementId) {
      setElementos(elementos.filter(el => el.id !== selectedElementId));
      setSelectedElementId(null);
    } else {
      setElementos([]);
    }
  };

  return (
    <LienzoContext.Provider
      value={{
        tamano,
        setTamano,
        colorLienzo,
        setColorLienzo,
        mostrarPrompt,
        mostrarPromptGuardarCargar,
        offsetReal,
        offsetRender,
        setOffsetReal,
        setOffsetRender,
        zoom,
        setZoom,
        grosorBorde,
        setGrosorBorde,
        herramientaActual,
        setHerramientaActual,
        figuraTipo,
        setFiguraTipo,
        colorFigura,
        setColorFigura,
        grosorFigura,
        setGrosorFigura,
        elementos,
        currentElement: null,
        setCurrentElement: () => {},
        selectedElementId,
        setSelectedElementId,
        multiSelectedIds,
        setMultiSelectedIds,
        addElemento,
        actualizarElemento,
        clearElementos,
        setElementos,
        imagenCargada,
        setImagenCargada,
        clipboardElements,
        setClipboardElements,
      }}
    >
      <section
        className="app-shell w-full h-screen bg-gray-700 overflow-hidden"
        onKeyDownCapture={(event) => {
          if (requiereOrientacionHorizontal) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <Lienzo />
        <Toolbar />
        <PanelFiguras />
        <PanelSeleccion />
        <ZoomBar />
        <BotonGrosor />
        {!mostrarPrompt && !mostrarPromptGuardarCargar && (
          <MenuHamburguesa
            onNuevo={crearNuevoLienzo}
            onGuardar={abrirGuardarLienzo}
            onCargar={abrirCargarLienzo}
          />
        )}
        <AnimacionMorphing mostrar={mostrarPrompt} lado="izquierda" />
        {mostrarPrompt && <div className="fixed inset-0 z-45" />}
        <Prompteador
          mostrarPrompt={mostrarPrompt}
          setMostrarPrompt={setMostrarPrompt}
        />
        <AnimacionMorphing mostrar={mostrarPrompt} lado="derecha" />
        <PromptGuardarCargar
          mostrar={mostrarPromptGuardarCargar}
          setMostrar={setMostrarPromptGuardarCargar}
          modo={modoPrompt}
          onLoadCanvas={(datos) => {
            setTamano(datos.tamano);
            setColorLienzo(datos.colorLienzo);
            setElementos(datos.elementos);
            setElementosGuardados(datos.elementos);
            setSelectedElementId(null);
            setMultiSelectedIds([]);
            setOffsetReal({ x: 0, y: 0 });
            setOffsetRender({ x: 0, y: 0 });
            setZoom(1);
          }}
          onSaveSlot={(elementosGuardadosEnBackend) => {
            const idsImagenActiva = elementos
              .filter((elemento) => elemento.tipo === "imagen" && elemento.storageKey === imagenCargada?.storageKey)
              .map((elemento) => elemento.id);
            const imagenGuardada = elementosGuardadosEnBackend.find(
              (elemento) => elemento.tipo === "imagen" && idsImagenActiva.includes(elemento.id)
            );
            if (imagenGuardada?.tipo === "imagen" && imagenGuardada.storageKey) {
              setImagenCargada({ src: imagenGuardada.src, storageKey: imagenGuardada.storageKey });
            }
            setElementos(elementosGuardadosEnBackend);
            setElementosGuardados(elementosGuardadosEnBackend);
          }}
        />
        <PromptAdvertenciaCambios
          mostrar={mostrarAdvertencia}
          setMostrar={(v) => {
            setMostrarAdvertencia(v);
            if (!v) setAccionPendiente(null);
          }}
          onGuardar={() => {
            setMostrarAdvertencia(false);
            setModoPrompt("guardar");
            setMostrarPromptGuardarCargar(true);
          }}
          onIgnorar={() => {
            setMostrarAdvertencia(false);
            accionPendienteRef.current?.();
            setAccionPendiente(null);
            accionPendienteRef.current = null;
          }}
        />
        {requiereOrientacionHorizontal && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="orientacion-horizontal-titulo"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950 p-6 text-center text-white"
          >
            <div className="flex max-w-sm flex-col items-center">
              <svg
                aria-hidden="true"
                className="mb-5 h-16 w-16 text-sky-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect x="7" y="3" width="10" height="18" rx="2" strokeWidth="1.8" />
                <path d="M10 6h4M11 18h2" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M3 9a8 8 0 0 1 2-3m16 9a8 8 0 0 1-2 3" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <h1 id="orientacion-horizontal-titulo" className="mb-3 text-xl font-bold">
                Gira tu celular
              </h1>
              <p className="text-base text-zinc-200">
                Coloca el celular en orientación horizontal para usar mejor el editor.
                Al girarlo, podrás continuar automáticamente.
              </p>
            </div>
          </div>
        )}
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
