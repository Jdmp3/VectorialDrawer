import { useState, useEffect, useRef } from "react";
import Prompteador from "./Components/PromptDeLienzo";
import AnimacionMorphing from "./Components/AnimacionMorphing";
import PromptGuardarCargar from "./Components/PromptGuardarCargar";
import PromptAdvertenciaCambios from "./Components/PromptAdvertenciaCambios";
import Lienzo from "./Components/Lienzo";
import ZoomBar from "./Components/ZoomBar";
import BotonGrosor from "./Components/BotonGrosor";
import Toolbar from "./Components/Toolbar";
import PanelFiguras from "./Components/PanelFiguras";
import MenuHamburguesa from "./Components/MenuHamburguesa";
import { LienzoContext, VectorElement } from "./Components/ContextDeLienzo";

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
  const [imagenCargada, setImagenCargada] = useState("");
  const [elementos, setElementos] = useState<VectorElement[]>([]);
  const [elementosGuardados, setElementosGuardados] = useState<VectorElement[]>([]);
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<(() => void) | null>(null);
  const accionPendienteRef = useRef<(() => void) | null>(null);
  accionPendienteRef.current = accionPendiente;

  useEffect(() => {
    if (herramientaActual !== "seleccionar") {
      setSelectedElementId(null);
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
    if (herramientaActual === "seleccionar" && selectedElementId) {
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
        addElemento,
        actualizarElemento,
        clearElementos,
        setElementos,
        imagenCargada,
        setImagenCargada,
      }}
    >
      <section className="w-full h-screen bg-gray-700 overflow-hidden">
        <Lienzo />
        <Toolbar />
        <PanelFiguras />
        <ZoomBar />
        <BotonGrosor />
        {!mostrarPrompt && !mostrarPromptGuardarCargar && (
          <MenuHamburguesa
            onNuevo={() => {
              const hayCambiosNoGuardados =
                elementos.length > 0 &&
                JSON.stringify(elementos) !== JSON.stringify(elementosGuardados);
              if (hayCambiosNoGuardados) {
                setAccionPendiente(() => () => {
                  setMostrarPrompt(true);
                  setElementos([]);
                  setSelectedElementId(null);
                  setHerramientaActual("seleccionar");
                });
                setMostrarAdvertencia(true);
              } else {
                setMostrarPrompt(true);
                setElementos([]);
                setSelectedElementId(null);
                setHerramientaActual("seleccionar");
              }
            }}
            onGuardar={() => {
              setModoPrompt("guardar");
              setMostrarPromptGuardarCargar(true);
            }}
            onCargar={() => {
              const hayCambiosNoGuardados =
                elementos.length > 0 &&
                JSON.stringify(elementos) !== JSON.stringify(elementosGuardados);
              if (hayCambiosNoGuardados) {
                setAccionPendiente(() => () => {
                  setModoPrompt("cargar");
                  setMostrarPromptGuardarCargar(true);
                });
                setMostrarAdvertencia(true);
              } else {
                setModoPrompt("cargar");
                setMostrarPromptGuardarCargar(true);
              }
            }}
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
            setOffsetReal({ x: 0, y: 0 });
            setOffsetRender({ x: 0, y: 0 });
            setZoom(1);
          }}
          onSaveSlot={() => setElementosGuardados([...elementos])}
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
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
