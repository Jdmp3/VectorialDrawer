import { useState, useEffect } from "react";
import Prompteador from "./Components/PromptDeLienzo";
import Lienzo from "./Components/Lienzo";
import ZoomBar from "./Components/ZoomBar";
import BotonGrosor from "./Components/BotonGrosor";
import Toolbar from "./Components/Toolbar";
import PanelFiguras from "./Components/PanelFiguras";
import { LienzoContext, VectorElement } from "./Components/ContextDeLienzo";

function App() {
  const [tamano, setTamano] = useState(16);
  const [colorLienzo, setColorLienzo] = useState("#3d3d3d");
  const [mostrarPrompt, setMostrarPrompt] = useState(true);
  const [offsetReal, setOffsetReal] = useState({ x: 0, y: 0 });
  const [offsetRender, setOffsetRender] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [grosorBorde, setGrosorBorde] = useState(0.1);
  const [herramientaActual, setHerramientaActual] = useState<"figuras" | "mover" | "seleccionar">("mover");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [figuraTipo, setFiguraTipo] = useState<"linea" | "rectangulo" | "circulo">("linea");
  const [colorFigura, setColorFigura] = useState("#000000");
  const [grosorFigura, setGrosorFigura] = useState(2);
  const [elementos, setElementos] = useState<VectorElement[]>([]);

  useEffect(() => {
    if (herramientaActual !== "seleccionar") {
      setSelectedElementId(null);
    }
  }, [herramientaActual]);

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
      }}
    >
      <section className="w-full h-screen bg-gray-700 overflow-hidden">
        <Lienzo />
        <Toolbar />
        <PanelFiguras />
        <ZoomBar />
        <BotonGrosor />
        <Prompteador
          mostrarPrompt={mostrarPrompt}
          setMostrarPrompt={setMostrarPrompt}
        />
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
