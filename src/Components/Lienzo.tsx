import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";

const TAMANO_VISUAL = 1024;
const FACTOR_LERP = 0.5;

const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;

let nextId = 1;
const genId = () => `fig-${nextId++}`;

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
    figuraTipo,
    colorFigura,
    grosorFigura,
    elementos,
    addElemento,
    selectedElementId,
    setSelectedElementId,
  } = useContext(LienzoContext);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLocal, setCurrentLocal] = useState<VectorElement | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
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
  }, [
    offsetReal.x,
    offsetReal.y,
    offsetRender.x,
    offsetRender.y,
    setOffsetRender,
  ]);

  const viewBoxSize = tamano / zoom;
  const isZoomedOut = viewBoxSize > tamano;
  const centeredOffset = isZoomedOut ? { x: 0, y: 0 } : offsetRender;
  const maxOffset = tamano - viewBoxSize;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

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
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: offsetReal.x,
        offsetY: offsetReal.y,
      });
    } else if (herramientaActual === "figuras") {
      const pos = getMousePosition(e);
      const id = genId();
      let elem: VectorElement;
      switch (figuraTipo) {
        case "linea":
          elem = {
            id,
            tipo: "linea",
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
            color: colorFigura,
            grosor: grosorFigura,
          };
          break;
        case "rectangulo":
          elem = {
            id,
            tipo: "rectangulo",
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            color: colorFigura,
            grosor: grosorFigura,
          };
          break;
        case "circulo":
          elem = {
            id,
            tipo: "circulo",
            cx: pos.x,
            cy: pos.y,
            r: 0,
            color: colorFigura,
            grosor: grosorFigura,
          };
          break;
      }
      setCurrentLocal(elem);
      setDrawStart(pos);
      setIsDrawing(true);
    } else if (herramientaActual === "seleccionar") {
      const target = e.target as SVGElement;
      const id = target.getAttribute("data-element-id");
      setSelectedElementId(id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && herramientaActual === "mover") {
      const deltaX = (dragStart.x - e.clientX) / zoom;
      const deltaY = (dragStart.y - e.clientY) / zoom;
      const newX = clamp(dragStart.offsetX + deltaX, 0, maxOffset);
      const newY = clamp(dragStart.offsetY + deltaY, 0, maxOffset);
      setOffsetReal({ x: newX, y: newY });
    } else if (
      isDrawing &&
      herramientaActual === "figuras" &&
      currentLocal &&
      drawStart
    ) {
      const pos = getMousePosition(e);
      switch (currentLocal.tipo) {
        case "linea":
          setCurrentLocal({ ...currentLocal, x2: pos.x, y2: pos.y });
          break;
        case "rectangulo": {
          const x = Math.min(drawStart.x, pos.x);
          const y = Math.min(drawStart.y, pos.y);
          const w = Math.abs(pos.x - drawStart.x);
          const h = Math.abs(pos.y - drawStart.y);
          setCurrentLocal({ ...currentLocal, x, y, width: w, height: h });
          break;
        }
        case "circulo": {
          const dx = pos.x - drawStart.x;
          const dy = pos.y - drawStart.y;
          setCurrentLocal({ ...currentLocal, r: Math.sqrt(dx * dx + dy * dy) });
          break;
        }
      }
    }
  };

  const finalizeDrawing = () => {
    if (currentLocal) {
      const valid =
        (currentLocal.tipo === "linea" &&
          (currentLocal.x1 !== currentLocal.x2 ||
            currentLocal.y1 !== currentLocal.y2)) ||
        (currentLocal.tipo === "rectangulo" &&
          currentLocal.width > 0 &&
          currentLocal.height > 0) ||
        (currentLocal.tipo === "circulo" && currentLocal.r > 0);
      if (valid) {
        addElemento(currentLocal);
      }
    }
    setCurrentLocal(null);
    setDrawStart(null);
    setIsDrawing(false);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
    if (isDrawing) {
      finalizeDrawing();
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
    if (isDrawing) finalizeDrawing();
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
    if (herramientaActual === "figuras") return "crosshair";
    if (herramientaActual === "seleccionar") return "default";
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
          aspectRatio: "1 / 1",
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
        <rect
          x={centeredOffset.x}
          y={centeredOffset.y}
          width={viewBoxSize}
          height={viewBoxSize}
          fill="url(#grid)"
        />
        <g clipPath="url(#lienzoClip)">
          {elementos.map((el) => {
            const sel = el.id === selectedElementId;
            switch (el.tipo) {
              case "linea":
                return (
                  <g key={el.id}>
                    {sel && (
                      <line
                        x1={el.x1}
                        y1={el.y1}
                        x2={el.x2}
                        y2={el.y2}
                        stroke="#3b82f6"
                        strokeWidth={el.grosor + 4}
                        strokeLinecap="round"
                        strokeDasharray="4,4"
                        pointerEvents="none"
                      />
                    )}
                    <line
                      data-element-id={el.id}
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      strokeLinecap="round"
                    />
                  </g>
                );
              case "rectangulo":
                return (
                  <g key={el.id}>
                    {sel && (
                      <rect
                        x={el.x - 3}
                        y={el.y - 3}
                        width={el.width + 6}
                        height={el.height + 6}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="4,4"
                        pointerEvents="none"
                      />
                    )}
                    <rect
                      data-element-id={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      fill="none"
                    />
                  </g>
                );
              case "circulo":
                return (
                  <g key={el.id}>
                    {sel && (
                      <circle
                        cx={el.cx}
                        cy={el.cy}
                        r={el.r + 3}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="4,4"
                        pointerEvents="none"
                      />
                    )}
                    <circle
                      data-element-id={el.id}
                      cx={el.cx}
                      cy={el.cy}
                      r={el.r}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      fill="none"
                    />
                  </g>
                );
            }
          })}
          {currentLocal?.tipo === "linea" && (
            <line
              x1={currentLocal.x1}
              y1={currentLocal.y1}
              x2={currentLocal.x2}
              y2={currentLocal.y2}
              stroke={currentLocal.color}
              strokeWidth={currentLocal.grosor}
              strokeLinecap="round"
            />
          )}
          {currentLocal?.tipo === "rectangulo" && (
            <rect
              x={currentLocal.x}
              y={currentLocal.y}
              width={currentLocal.width}
              height={currentLocal.height}
              stroke={currentLocal.color}
              strokeWidth={currentLocal.grosor}
              fill="none"
            />
          )}
          {currentLocal?.tipo === "circulo" && (
            <circle
              cx={currentLocal.cx}
              cy={currentLocal.cy}
              r={currentLocal.r}
              stroke={currentLocal.color}
              strokeWidth={currentLocal.grosor}
              fill="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

export default Lienzo;
