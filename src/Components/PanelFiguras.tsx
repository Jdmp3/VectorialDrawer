import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext } from "./ContextDeLienzo";

function PanelFiguras() {
  const {
    herramientaActual,
    mostrarPrompt,
    figuraTipo,
    setFiguraTipo,
    colorFigura,
    setColorFigura,
    grosorFigura,
    setGrosorFigura,
    imagenCargada,
    setImagenCargada,
  } = useContext(LienzoContext);

  const [visible, setVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisible(!mostrarPrompt);
  }, [mostrarPrompt]);

  if (herramientaActual !== "figuras") {
    return null;
  }

  const botonClase = (tipo: "linea" | "rectangulo" | "circulo" | "imagen") =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      figuraTipo === tipo
        ? "bg-blue-600 text-white"
        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
    }`;

  const handleCargarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagenCargada((ev.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className={`fixed right-40 top-4 bg-zinc-900 p-4 rounded-xl shadow-lg z-50 flex flex-col gap-3 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex gap-2">
        <button
          className={botonClase("linea")}
          onClick={() => setFiguraTipo("linea")}
        >
          Línea
        </button>
        <button
          className={botonClase("rectangulo")}
          onClick={() => setFiguraTipo("rectangulo")}
        >
          Rectángulo
        </button>
        <button
          className={botonClase("circulo")}
          onClick={() => setFiguraTipo("circulo")}
        >
          Círculo
        </button>
        <button
          className={botonClase("imagen")}
          onClick={() => setFiguraTipo("imagen")}
        >
          Imagen
        </button>
      </div>
      {figuraTipo === "imagen" ? (
        <div className="flex items-center gap-3">
          <button
            onClick={handleCargarClick}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {imagenCargada ? "Imagen cargada" : "Cargar"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-zinc-300 text-sm font-medium">Color:</label>
            <input
              type="color"
              value={colorFigura}
              onChange={(e) => setColorFigura(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-zinc-300 text-sm font-medium">Grosor:</label>
            <input
              type="range"
              min="1"
              max="10"
              value={grosorFigura}
              onChange={(e) => setGrosorFigura(Number(e.target.value))}
              className="w-32 cursor-pointer"
            />
            <span className="text-zinc-400 text-sm w-6">{grosorFigura}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default PanelFiguras;
