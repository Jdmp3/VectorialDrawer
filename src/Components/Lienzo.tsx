import { useContext, useState, useEffect } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const TAMANO_VISUAL = 1024;

function Lienzo() {
  const { tamano, mostrarPrompt, offset, setOffset, zoom, grosorBorde } =
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-800">
      <svg
        width={TAMANO_VISUAL}
        height={TAMANO_VISUAL}
        viewBox={`${centeredOffset.x} ${centeredOffset.y} ${viewBoxSize} ${viewBoxSize}`}
        className={`bg-zinc-600 shadow-2xl transition-opacity duration-500 ${
          mostrarPrompt ? "opacity-0" : "opacity-100"
        }`}
        style={{
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
              d="M 1 0 L 0 0 0 1"
              fill="none"
              stroke="gray"
              strokeWidth={grosorBorde}
            />
          </pattern>
        </defs>
        <rect width={tamano} height={tamano} fill="url(#grid)" />
        <line
          x1={tamano}
          y1={0}
          x2={tamano}
          y2={tamano}
          stroke="gray"
          strokeWidth={grosorBorde}
        />
        <line
          x1={0}
          y1={tamano}
          x2={tamano}
          y2={tamano}
          stroke="gray"
          strokeWidth={grosorBorde}
        />
      </svg>
    </div>
  );
}

export default Lienzo;
