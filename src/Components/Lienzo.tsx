import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const TAMANO_VISUAL = 1024;

function Lienzo() {
  const { tamano, mostrarPrompt, offset, setOffset, zoom, grosorBorde, colorLienzo } =
    useContext(LienzoContext);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const viewBoxSize = tamano / zoom;
    const maxOffset = tamano - viewBoxSize;
    const clampedX = Math.min(offset.x, Math.max(0, maxOffset));
    const clampedY = Math.min(offset.y, Math.max(0, maxOffset));
    if (clampedX !== offset.x || clampedY !== offset.y) {
      setOffset({ x: clampedX, y: clampedY });
    }
  }, [zoom, tamano, offset.x, offset.y, setOffset]);

  const viewBoxSize = tamano / zoom;
  const isZoomedOut = viewBoxSize > tamano;
  const centeredOffset = isZoomedOut 
    ? { x: 0, y: 0 }
    : offset;
  const maxOffset = tamano - viewBoxSize;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!e.ctrlKey || isZoomedOut) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = (dragStart.x - e.clientX) / zoom;
    const deltaY = (dragStart.y - e.clientY) / zoom;
    const newX = clamp(offset.x + deltaX, 0, maxOffset);
    const newY = clamp(offset.y + deltaY, 0, maxOffset);
    setOffset({ x: newX, y: newY });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const esColorClaro = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminosidad > 0.5;
  };

  const colorCuadricula = esColorClaro(colorLienzo) ? "black" : "gray";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-800">
      <svg
        width={TAMANO_VISUAL}
        height={TAMANO_VISUAL}
        viewBox={`${centeredOffset.x} ${centeredOffset.y} ${viewBoxSize} ${viewBoxSize}`}
        className={`shadow-2xl transition-opacity duration-500 ${
          mostrarPrompt ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backgroundColor: colorLienzo,
          maxWidth: "100%",
          maxHeight: "100%",
          cursor: isDragging ? "grabbing" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <pattern id="grid" width={1} height={1} patternUnits="userSpaceOnUse">
            <path
              d="M 1 0 L 0 0 0 1 M 0 1 L 1 1 1 0"
              fill="none"
              stroke={colorCuadricula}
              strokeWidth={grosorBorde}
            />
          </pattern>
        </defs>
        <rect width={tamano} height={tamano} fill="url(#grid)" />
      </svg>
    </div>
  );
}

export default Lienzo;
