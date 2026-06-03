import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

export default function ZoomBar() {
  const { zoom, setZoom, mostrarPrompt } = useContext(LienzoContext);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!mostrarPrompt);
  }, [mostrarPrompt]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setZoom(Math.max(1, Math.min(8, value)));
  };

  return (
    <div
      className={`fixed z-40 left-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-4 bg-zinc-800 rounded-r-lg transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="text-white text-sm font-medium">Zoom</span>
      
      <input
        type="range"
        min="1"
        max="8"
        step="0.1"
        value={zoom}
        onChange={handleZoomChange}
        className="writing-vertical writing-rl"
        style={{
          writingMode: "vertical-lr",
          direction: "rtl",
          height: "200px",
          accentColor: "#3b82f6"
        }}
      />
      
      <span className="text-white text-lg font-bold">{zoom.toFixed(1)}x</span>
    </div>
  );
}