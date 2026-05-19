import { useState } from "react";
import "./App.css";
import Prompteador from "./Components/PromptDeLienzo";
import Lienzo from "./Components/Lienzo";
import ZoomBar from "./Components/ZoomBar";
import BotonGrosor from "./Components/BotonGrosor";
import { LienzoContext } from "./Components/ContextDeLienzo";

function App() {
  const [tamano, setTamano] = useState(16);
  const [colorLienzo, setColorLienzo] = useState("#3d3d3d");
  const [mostrarPrompt, setMostrarPrompt] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [grosorBorde, setGrosorBorde] = useState(0.3);

  return (
    <LienzoContext.Provider
      value={{ tamano, setTamano, colorLienzo, setColorLienzo, mostrarPrompt, offset, setOffset, zoom, setZoom, grosorBorde, setGrosorBorde }}
    >
      <section className="w-full h-screen bg-gray-700 overflow-hidden">
        <Lienzo />
        <ZoomBar />
        <BotonGrosor />
        <Prompteador
          mostrarPrompt={mostrarPrompt}
          setMostrarPrompt={setMostrarPrompt}
        ></Prompteador>
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
