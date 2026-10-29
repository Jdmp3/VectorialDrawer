import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext } from "./ContextDeLienzo";
import { subirImagen } from "../services/canvasApi";

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
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const [infoVisible, setInfoVisible] = useState(false);
  const infoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoMostradoRef = useRef(false);
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
        ? "bg-sky-600 text-white"
        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
    }`;

  const handleCargarClick = () => {
    fileInputRef.current?.click();
  };

  const triggerInfo = () => {
    if (infoMostradoRef.current) return;
    infoMostradoRef.current = true;
    if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
    setInfoVisible(true);
    infoTimeoutRef.current = setTimeout(() => {
      setInfoVisible(false);
    }, 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoImagen(true);
    setErrorImagen("");
    try {
      setImagenCargada(await subirImagen(file));
      triggerInfo();
    } catch (error) {
      setErrorImagen(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendoImagen(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <div
        className={`figures-panel fixed right-40 top-4 bg-zinc-900 p-4 rounded-xl shadow-lg z-50 flex flex-col gap-3 transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
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
              disabled={subiendoImagen}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              {subiendoImagen ? "Subiendo…" : imagenCargada ? "Cambiar" : "Cargar"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <label className="text-zinc-300 text-sm font-medium">
                Color:
              </label>
              <input
                type="color"
                value={colorFigura}
                onChange={(e) => setColorFigura(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-zinc-300 text-sm font-medium">
                Grosor:
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={grosorFigura}
                onChange={(e) => setGrosorFigura(Number(e.target.value))}
                className="w-32 cursor-pointer accent-sky-600"
              />
              <span className="text-zinc-400 text-sm w-6">{grosorFigura}</span>
            </div>
          </>
        )}
        {errorImagen && <p className="max-w-56 text-xs text-red-300">{errorImagen}</p>}
      </div>
      <div
        className="figure-info-toast"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(0, 60, 30, 0.85)",
          color: "white",
          padding: "20px 32px",
          borderRadius: 12,
          fontSize: 20,
          fontWeight: 600,
          zIndex: 9999,
          pointerEvents: "none",
          fontFamily: "monospace",
          opacity: infoVisible ? 1 : 0,
          transition: "opacity 800ms ease-in-out",
        }}
      >
        Las imágenes se ponen igual que los Rectangulos.
      </div>
    </>
  );
}

export default PanelFiguras;
