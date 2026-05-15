import { useContext, useState } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const TAMANO_VISUAL = 1024;

function Lienzo() {
  const { tamano, mostrarPrompt, offset, setOffset } =
    useContext(LienzoContext);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const viewBoxSize = tamano / zoom;
  const maxOffset = tamano - viewBoxSize;
  const strokeWidth = Math.max(0.5, 1 / tamano);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(1, Math.min(8, zoom + delta));
    const newViewBoxSize = tamano / newZoom;
    const newMaxOffset = tamano - newViewBoxSize;
    setZoom(newZoom);
    setOffset({
      x: clamp(offset.x, 0, newMaxOffset),
      y: clamp(offset.y, 0, newMaxOffset),
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!e.ctrlKey) return;
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
    <div
      className="fixed inset-0 flex items-center justify-center bg-zinc-800"
      role="presentation"
    >
      <svg
        width={TAMANO_VISUAL}
        height={TAMANO_VISUAL}
        viewBox={`${offset.x} ${offset.y} ${viewBoxSize} ${viewBoxSize}`}
        className={`bg-zinc-600 shadow-2xl transition-opacity duration-500 ${
          mostrarPrompt ? "opacity-0" : "opacity-100"
        }`}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          cursor: isDragging ? "grabbing" : "default",
        }}
        onWheel={handleWheel}
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
              strokeWidth={strokeWidth}
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
          strokeWidth={0.3}
        />
        <line
          x1={0}
          y1={tamano}
          x2={tamano}
          y2={tamano}
          stroke="gray"
          strokeWidth={0.3}
        />
      </svg>
    </div>
  );
}

export default Lienzo;
