import { useState } from "react";
import "./App.css";
import Prompteador from "./Components/PromptDeLienzo";
import Lienzo from "./Components/Lienzo";
import { LienzoContext } from "./Components/ContextDeLienzo";

function App() {
  const [tamano, setTamano] = useState(16);
  const [mostrarPrompt, setMostrarPrompt] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <LienzoContext.Provider value={{ tamano, setTamano, mostrarPrompt, offset, setOffset }}>
      <section className="min-h-screen flex justify-center items-center w-full bg-gray-700 overflow-hidden h-screen">
        <Lienzo />
        <Prompteador
          mostrarPrompt={mostrarPrompt}
          setMostrarPrompt={setMostrarPrompt}
        ></Prompteador>
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
