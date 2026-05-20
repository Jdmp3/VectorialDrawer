import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext } from "./ContextDeLienzo";

const TAMANO_VISUAL = 1024;
const FACTOR_LERP = 0.5;

const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;

const puntosToPath = (puntos: { x: number; y: number }[]): string =>
  puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

function Lienzo() {
  const {
    tamano,
    mostrarPrompt,
    offsetReal,
    offsetRender,
    setOffsetReal,
    setOffsetRender,
    zoom,
    grosorBorde,
    colorLienzo,
    herramientaActual,
    strokes,
    currentStroke,
    setCurrentStroke,
    addStroke,
    colorLapiz,
    grosorLapiz,
  } = useContext(LienzoContext);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const viewBoxSize = tamano / zoom;
    const maxOffset = tamano - viewBoxSize;
    const clampedX = Math.min(offsetReal.x, Math.max(0, maxOffset));
    const clampedY = Math.min(offsetReal.y, Math.max(0, maxOffset));
    if (clampedX !== offsetReal.x || clampedY !== offsetReal.y) {
      setOffsetReal({ x: clampedX, y: clampedY });
    }
  }, [zoom, tamano, offsetReal.x, offsetReal.y, setOffsetReal]);

  useEffect(() => {
    let animacionId: number;

    const animate = () => {
      const newX = lerp(offsetRender.x, offsetReal.x, FACTOR_LERP);
      const newY = lerp(offsetRender.y, offsetReal.y, FACTOR_LERP);
      setOffsetRender({ x: newX, y: newY });
      animacionId = requestAnimationFrame(animate);
    };

    animacionId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animacionId);
  }, [offsetReal.x, offsetReal.y, offsetRender.x, offsetRender.y, setOffsetRender]);

  const viewBoxSize = tamano / zoom;
  const isZoomedOut = viewBoxSize > tamano;
  const centeredOffset = isZoomedOut ? { x: 0, y: 0 } : offsetRender;
  const maxOffset = tamano - viewBoxSize;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const clampPunto = (p: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(tamano, p.x)),
    y: Math.max(0, Math.min(tamano, p.y)),
  });

  const getMousePosition = (e: React.MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let posX = centeredOffset.x + (x / rect.width) * viewBoxSize;
    let posY = centeredOffset.y + (y / rect.height) * viewBoxSize;

    posX = Math.max(0, Math.min(tamano, posX));
    posY = Math.max(0, Math.min(tamano, posY));

    return { x: posX, y: posY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomedOut) return;

    if (herramientaActual === "mover") {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, offsetX: offsetReal.x, offsetY: offsetReal.y });
    } else if (herramientaActual === "lapiz") {
      const pos = clampPunto(getMousePosition(e));
      setCurrentStroke([pos]);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && herramientaActual === "mover") {
      const deltaX = (dragStart.x - e.clientX) / zoom;
      const deltaY = (dragStart.y - e.clientY) / zoom;
      const newX = clamp(dragStart.offsetX + deltaX, 0, maxOffset);
      const newY = clamp(dragStart.offsetY + deltaY, 0, maxOffset);
      setOffsetReal({ x: newX, y: newY });
    } else if (isDrawing && herramientaActual === "lapiz" && currentStroke) {
      const pos = getMousePosition(e);
      if (pos.x >= 0 && pos.x <= tamano && pos.y >= 0 && pos.y <= tamano) {
        setCurrentStroke([...currentStroke, pos]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
    if (isDrawing && currentStroke && currentStroke.length > 1) {
      addStroke({ puntos: currentStroke, color: colorLapiz, grosor: grosorLapiz });
      setCurrentStroke(null);
    }
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
    if (isDrawing && currentStroke && currentStroke.length > 1) {
      addStroke({ puntos: currentStroke, color: colorLapiz, grosor: grosorLapiz });
      setCurrentStroke(null);
    }
    setIsDrawing(false);
  };

  const esColorClaro = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminosidad > 0.5;
  };

  const colorCuadricula = esColorClaro(colorLienzo) ? "black" : "gray";

  const getCursor = () => {
    if (herramientaActual === "mover") return isDragging ? "grabbing" : "grab";
    if (herramientaActual === "lapiz") return "crosshair";
    return "default";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-800">
      <svg
        ref={svgRef}
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
          cursor: getCursor(),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <clipPath id="lienzoClip">
            <rect x="0" y="0" width={tamano} height={tamano} />
          </clipPath>
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
        <g clipPath="url(#lienzoClip)">
          {strokes.map((stroke, i) => (
            <path
              key={i}
              d={puntosToPath(stroke.puntos)}
              stroke={stroke.color}
              strokeWidth={stroke.grosor}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke && currentStroke.length > 1 && (
            <path
              d={puntosToPath(currentStroke)}
              stroke={colorLapiz}
              strokeWidth={grosorLapiz}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

export default Lienzo;