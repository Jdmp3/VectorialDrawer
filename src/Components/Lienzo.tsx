import { useContext, useState, useEffect, useRef } from "react";
import { LienzoContext, VectorElement } from "./ContextDeLienzo";
import { getHandleConfig } from "../utils/geometry";

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
    actualizarElemento,
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
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragElementStart, setDragElementStart] = useState<{
    mouseX: number;
    mouseY: number;
    initialPos: VectorElement;
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    mouseX: number;
    mouseY: number;
    mouseCanvasX: number;
    mouseCanvasY: number;
    initialElement: VectorElement;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
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
      const handleId = target.getAttribute("data-handle-id");
      if (handleId) {
        const parentEl = target.closest("[data-element-id]");
        const id = parentEl?.getAttribute("data-element-id") ?? null;
        if (id) {
          const element = elementos.find((el) => el.id === id);
          if (element) {
            const pos = getMousePosition(e);
            setSelectedElementId(id);
            setIsResizing(true);
            setResizeHandle(handleId);
            setResizeStart({
              mouseX: e.clientX,
              mouseY: e.clientY,
              mouseCanvasX: pos.x,
              mouseCanvasY: pos.y,
              initialElement: { ...element },
            });
          }
        }
        return;
      }
      const id = target.closest("[data-element-id]")?.getAttribute("data-element-id") ?? null;
      setSelectedElementId(id);
      if (id) {
        const element = elementos.find((el) => el.id === id);
        if (element) {
          const pos = getMousePosition(e);
          setIsDraggingElement(true);
          setDragElementStart({
            mouseX: pos.x,
            mouseY: pos.y,
            initialPos: { ...element },
          });
        }
      }
    }
  };

  const resizeRectangulo = (
    anchorX: number, anchorY: number,
    mouseX: number, mouseY: number,
    origW: number, origH: number,
    shiftKey: boolean
  ) => {
    let rawW = mouseX - anchorX;
    let rawH = mouseY - anchorY;
    if (shiftKey && origW > 0 && origH > 0) {
      const ratioW = rawW / origW;
      const ratioH = rawH / origH;
      if (Math.abs(ratioW) >= Math.abs(ratioH)) {
        rawH = origH * ratioW;
      } else {
        rawW = origW * ratioH;
      }
    }
    return {
      x: rawW >= 0 ? anchorX : anchorX + rawW,
      y: rawH >= 0 ? anchorY : anchorY + rawH,
      width: Math.abs(rawW),
      height: Math.abs(rawH),
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing && resizeStart && resizeHandle && herramientaActual === "seleccionar") {
      const pos = getMousePosition(e);
      const el = resizeStart.initialElement;
      setTooltipPos({ x: e.clientX, y: e.clientY });

      let updated: VectorElement;

      switch (el.tipo) {
        case "rectangulo": {
          const { x: origX, y: origY, width: origW, height: origH } = el;
          let anchorX: number, anchorY: number;
          switch (resizeHandle) {
            case "se": anchorX = origX; anchorY = origY; break;
            case "nw": anchorX = origX + origW; anchorY = origY + origH; break;
            case "ne": anchorX = origX; anchorY = origY + origH; break;
            case "sw": anchorX = origX + origW; anchorY = origY; break;
            default: anchorX = origX; anchorY = origY;
          }
          updated = {
            ...el,
            ...resizeRectangulo(anchorX, anchorY, pos.x, pos.y, origW, origH, e.shiftKey),
          };
          break;
        }
        case "circulo": {
          const r = Math.hypot(pos.x - el.cx, pos.y - el.cy);
          updated = { ...el, r };
          break;
        }
        case "linea": {
          if (resizeHandle === "p1") {
            updated = { ...el, x1: pos.x, y1: pos.y };
          } else {
            updated = { ...el, x2: pos.x, y2: pos.y };
          }
          break;
        }
      }

      actualizarElemento(el.id, updated);
      return;
    }

    if (isDragging && herramientaActual === "mover") {
      const deltaX = (dragStart.x - e.clientX) / zoom;
      const deltaY = (dragStart.y - e.clientY) / zoom;
      const newX = clamp(dragStart.offsetX + deltaX, 0, maxOffset);
      const newY = clamp(dragStart.offsetY + deltaY, 0, maxOffset);
      setOffsetReal({ x: newX, y: newY });
    } else if (
      isDraggingElement &&
      dragElementStart &&
      herramientaActual === "seleccionar"
    ) {
      const pos = getMousePosition(e);
      const dx = pos.x - dragElementStart.mouseX;
      const dy = pos.y - dragElementStart.mouseY;
      const original = dragElementStart.initialPos;
      let updated: VectorElement;
      switch (original.tipo) {
        case "linea":
          updated = {
            ...original,
            x1: original.x1 + dx,
            y1: original.y1 + dy,
            x2: original.x2 + dx,
            y2: original.y2 + dy,
          };
          break;
        case "rectangulo":
          updated = { ...original, x: original.x + dx, y: original.y + dy };
          break;
        case "circulo":
          updated = { ...original, cx: original.cx + dx, cy: original.cy + dy };
          break;
      }
      actualizarElemento(original.id, updated);
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

  const endResize = () => {
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
  };

  const handleMouseUp = () => {
    if (isResizing) { endResize(); }
    if (isDragging) { setIsDragging(false); }
    if (isDrawing) { finalizeDrawing(); }
    if (isDraggingElement) setIsDraggingElement(false);
  };

  const handleMouseLeave = () => {
    if (isResizing) endResize();
    if (isDragging) setIsDragging(false);
    if (isDrawing) finalizeDrawing();
    if (isDraggingElement) setIsDraggingElement(false);
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
    if (isResizing && resizeHandle) {
      if (resizeHandle === "nw" || resizeHandle === "se") return "nwse-resize";
      if (resizeHandle === "ne" || resizeHandle === "sw") return "nesw-resize";
      if (resizeHandle === "p1" || resizeHandle === "p2") return "move";
    }
    if (herramientaActual === "mover") return isDragging ? "grabbing" : "grab";
    if (herramientaActual === "figuras") return "crosshair";
    if (herramientaActual === "seleccionar")
      return isDraggingElement ? "grabbing" : "default";
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
            const { offset: offsetSel, strokeWidth: swSel, handleRadius } =
              getHandleConfig(tamano);
            switch (el.tipo) {
              case "linea":
                return (
                  <g key={el.id} data-element-id={el.id}>
                    <line
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      strokeLinecap="round"
                    />
                    {sel && (
                      <g>
                        <circle data-handle-id="p1" cx={el.x1} cy={el.y1} r={handleRadius * 1.5} fill="#3b82f6" cursor="move" />
                        <circle data-handle-id="p2" cx={el.x2} cy={el.y2} r={handleRadius * 1.5} fill="#3b82f6" cursor="move" />
                      </g>
                    )}
                  </g>
                );
              case "rectangulo":
                return (
                  <g key={el.id} data-element-id={el.id}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      fill="none"
                    />
                    {sel && (
                      <g>
                        <rect
                          x={el.x - offsetSel}
                          y={el.y - offsetSel}
                          width={el.width + offsetSel * 2}
                          height={el.height + offsetSel * 2}
                          stroke="#3b82f6"
                          strokeWidth={swSel}
                          fill="none"
                          pointerEvents="none"
                        />
                        <circle data-handle-id="nw" cx={el.x - offsetSel} cy={el.y - offsetSel} r={handleRadius} fill="#3b82f6" cursor="nwse-resize" />
                        <circle data-handle-id="ne" cx={el.x + el.width + offsetSel} cy={el.y - offsetSel} r={handleRadius} fill="#3b82f6" cursor="nesw-resize" />
                        <circle data-handle-id="se" cx={el.x + el.width + offsetSel} cy={el.y + el.height + offsetSel} r={handleRadius} fill="#3b82f6" cursor="nwse-resize" />
                        <circle data-handle-id="sw" cx={el.x - offsetSel} cy={el.y + el.height + offsetSel} r={handleRadius} fill="#3b82f6" cursor="nesw-resize" />
                      </g>
                    )}
                  </g>
                );
              case "circulo":
                return (
                  <g key={el.id} data-element-id={el.id}>
                    <circle
                      data-element-id={el.id}
                      cx={el.cx}
                      cy={el.cy}
                      r={el.r}
                      stroke={el.color}
                      strokeWidth={el.grosor}
                      fill="none"
                    />
                    {sel &&
                      (() => {
                        const left = el.cx - el.r - offsetSel;
                        const top = el.cy - el.r - offsetSel;
                        const side = el.r * 2 + offsetSel * 2;
                        return (
                          <g>
                            <rect
                              x={left}
                              y={top}
                              width={side}
                              height={side}
                              stroke="#3b82f6"
                              strokeWidth={swSel}
                              fill="none"
                              pointerEvents="none"
                            />
                            <circle data-handle-id="nw" cx={left} cy={top} r={handleRadius} fill="#3b82f6" cursor="nwse-resize" />
                            <circle data-handle-id="ne" cx={left + side} cy={top} r={handleRadius} fill="#3b82f6" cursor="nesw-resize" />
                            <circle data-handle-id="se" cx={left + side} cy={top + side} r={handleRadius} fill="#3b82f6" cursor="nwse-resize" />
                            <circle data-handle-id="sw" cx={left} cy={top + side} r={handleRadius} fill="#3b82f6" cursor="nesw-resize" />
                          </g>
                        );
                      })()}
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
      {isResizing && (() => {
        const selEl = selectedElementId
          ? elementos.find(el => el.id === selectedElementId)
          : null;
        if (!selEl) return null;
        let texto = "";
        switch (selEl.tipo) {
          case "rectangulo":
            texto = `${Math.round(selEl.width)} × ${Math.round(selEl.height)}`;
            break;
          case "circulo":
            texto = `r: ${Math.round(selEl.r)}`;
            break;
          case "linea": {
            const d = Math.hypot(selEl.x2 - selEl.x1, selEl.y2 - selEl.y1);
            texto = `${Math.round(d * 10) / 10}`;
            break;
          }
        }
        return (
          <div
            style={{
              position: "fixed",
              left: tooltipPos.x + 16,
              top: tooltipPos.y - 32,
              background: "rgba(0,0,0,0.75)",
              color: "white",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 14,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 999,
              fontFamily: "monospace",
            }}
          >
            {texto}
          </div>
        );
      })()}
    </div>
  );
}

export default Lienzo;
