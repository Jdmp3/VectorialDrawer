import { useState } from "react";
import "./App.css";
import Prompteador from "./Components/PromptDeLienzo";
import { LienzoContext } from "./Components/ContextDeLienzo";

function App() {
  const [ancho, setAncho] = useState(400);
  const [alto, setAlto] = useState(800);
  const [mostrarPrompt, setMostrarPrompt] = useState(true);

  return (
    <LienzoContext.Provider value={{ ancho, alto, setAncho, setAlto }}>
      <section className="min-h-screen flex justify-center items-center w-full bg-gray-700 overflow-hidden h-screen">
        <Prompteador
          mostrarPrompt={mostrarPrompt}
          setMostrarPrompt={setMostrarPrompt}
        ></Prompteador>
      </section>
    </LienzoContext.Provider>
  );
}

export default App;
