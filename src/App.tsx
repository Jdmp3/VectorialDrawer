import { useState } from "react";
import Prompteador from "./Components/PromptDeLienzo";
import Lienzo from "./Components/Lienzo";
import ZoomBar from "./Components/ZoomBar";
import BotonGrosor from "./Components/BotonGrosor";
import Toolbar from "./Components/Toolbar";
import PanelLapiz from "./Components/PanelLapiz";
import { LienzoContext, Stroke } from "./Components/ContextDeLienzo";

function App() {
  const [tamano, setTamano] = useState(16);
  const [colorLienzo, setColorLienzo] = useState("#3d3d3d");
  const [mostrarPrompt, setMostrarPrompt] = useState(true);
  const [offsetReal, setOffsetReal] = useState({ x: 0, y: 0 });
  const [offsetRender, setOffsetRender] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [grosorBorde, setGrosorBorde] = useState(0.1);
  const [herramientaActual, setHerramientaActual] = useState<"lapiz" | "mover">("mover");
  const [colorLapiz, setColorLapiz] = useState("#000000");
  const [grosorLapiz, setGrosorLapiz] = useState(2);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);

  const addStroke = (stroke: Stroke) => {
    setStrokes([...strokes, stroke]);
  };

  const clearStrokes = () => {
    setStrokes([]);
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
        colorLapiz,
        setColorLapiz,
        grosorLapiz,
        setGrosorLapiz,
        strokes,
        setStrokes,
        addStroke,
        clearStrokes,
        currentStroke,
        setCurrentStroke,
      }}
    >
      <section className="w-full h-screen bg-gray-700 overflow-hidden">
        <Lienzo />
        <Toolbar />
        <PanelLapiz />
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