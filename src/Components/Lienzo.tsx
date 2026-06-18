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
    multiSelectedIds,
    setMultiSelectedIds,
    imagenCargada,
  } = useContext(LienzoContext);

  useEffect(() => {
    let maxId = 0;
    for (const el of elementos) {
      const m = el.id.match(/^fig-(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    if (maxId > 0) nextId = maxId + 1;
  }, [elementos]);

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
  const [warningVisible, setWarningVisible] = useState(false);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerWarning = () => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setWarningVisible(true);
    warningTimeoutRef.current = setTimeout(() => {
      setWarningVisible(false);
    }, 2000);
  };
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState<{
    mouseX: number;
    mouseY: number;
    centerX: number;
    centerY: number;
    initialDegres: number;
  } | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isMultiDragging, setIsMultiDragging] = useState(false);
  const [multiDragStart, setMultiDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    initialPositions: VectorElement[];
  } | null>(null);
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

  const degToRad = (d: number) => (d * Math.PI) / 180;

  const rotatePoint = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    angleRad: number,
  ) => {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };

  const getCornerCanvasPos = (
    x: number,
    y: number,
    w: number,
    h: number,
    degres: number,
    corner: string,
    offset: number,
  ) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const θ = degToRad(degres);
    let lx: number, ly: number;
    switch (corner) {
      case "nw":
        lx = x - offset;
        ly = y - offset;
        break;
      case "ne":
        lx = x + w + offset;
        ly = y - offset;
        break;
      case "se":
        lx = x + w + offset;
        ly = y + h + offset;
        break;
      case "sw":
        lx = x - offset;
        ly = y + h + offset;
        break;
      default:
        lx = x;
        ly = y;
    }
    return rotatePoint(lx, ly, cx, cy, θ);
  };

  const isPointInRect = (
    px: number, py: number,
    rx: number, ry: number, rw: number, rh: number,
  ) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

  const shouldSelectElement = (el: VectorElement, rect: { x: number; y: number; w: number; h: number }) => {
    const { x: rx, y: ry, w: rw, h: rh } = rect;
    switch (el.tipo) {
      case "linea":
        return (
          isPointInRect(el.x1, el.y1, rx, ry, rw, rh) ||
          isPointInRect(el.x2, el.y2, rx, ry, rw, rh)
        );
      case "rectangulo":
      case "imagen":
        return (
          isPointInRect(el.x, el.y, rx, ry, rw, rh) ||
          isPointInRect(el.x + el.width, el.y, rx, ry, rw, rh) ||
          isPointInRect(el.x, el.y + el.height, rx, ry, rw, rh) ||
          isPointInRect(el.x + el.width, el.y + el.height, rx, ry, rw, rh)
        );
      case "circulo":
        return (
          isPointInRect(el.cx, el.cy, rx, ry, rw, rh) ||
          isPointInRect(el.cx - el.r, el.cy, rx, ry, rw, rh) ||
          isPointInRect(el.cx + el.r, el.cy, rx, ry, rw, rh) ||
          isPointInRect(el.cx, el.cy - el.r, rx, ry, rw, rh) ||
          isPointInRect(el.cx, el.cy + el.r, rx, ry, rw, rh)
        );
    }
  };

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
            degres: 0,
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
        case "imagen":
          elem = {
            id,
            tipo: "imagen",
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            src: imagenCargada,
            degres: 0,
          };
          break;
      }
      setCurrentLocal(elem);
      setDrawStart(pos);
      setIsDrawing(true);
    } else if (herramientaActual === "seleccionar") {
      const target = e.target as SVGElement;
      const clickedId =
        target.closest("[data-element-id]")?.getAttribute("data-element-id") ?? null;

      if (e.shiftKey) {
        if (clickedId) {
          const currentSet = new Set(multiSelectedIds);
          if (selectedElementId) currentSet.add(selectedElementId);
          if (currentSet.has(clickedId)) {
            currentSet.delete(clickedId);
          } else {
            currentSet.add(clickedId);
          }
          setMultiSelectedIds(Array.from(currentSet));
          setSelectedElementId(null);
        }
        return;
      }

      if (multiSelectedIds.length > 0) {
        if (clickedId && multiSelectedIds.includes(clickedId)) {
          const pos = getMousePosition(e);
          const initialPositions = elementos
            .filter(el => multiSelectedIds.includes(el.id))
            .map(el => ({ ...el }));
          setIsMultiDragging(true);
          setMultiDragStart({ mouseX: pos.x, mouseY: pos.y, initialPositions });
          return;
        }
        setMultiSelectedIds([]);
        if (clickedId) {
          const element = elementos.find((el) => el.id === clickedId);
          if (element) {
            setSelectedElementId(clickedId);
            const pos = getMousePosition(e);
            setIsDraggingElement(true);
            setDragElementStart({
              mouseX: pos.x,
              mouseY: pos.y,
              initialPos: { ...element },
            });
            return;
          }
        }
        setSelectedElementId(null);
        setMultiSelectedIds([]);
        const pos = getMousePosition(e);
        setIsBoxSelecting(true);
        setBoxSelectStart(pos);
        setBoxSelectRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
        return;
      }

      const handleId = target.getAttribute("data-handle-id");
      if (handleId) {
        if (handleId === "rotate") {
          const parentEl = target.closest("[data-element-id]");
          const id = parentEl?.getAttribute("data-element-id") ?? null;
          if (id) {
            const element = elementos.find((el) => el.id === id);
            if (element && (element.tipo === "rectangulo" || element.tipo === "imagen")) {
              const pos = getMousePosition(e);
              setSelectedElementId(id);
              setIsRotating(true);
              setRotateStart({
                mouseX: pos.x,
                mouseY: pos.y,
                centerX: element.x + element.width / 2,
                centerY: element.y + element.height / 2,
                initialDegres: element.degres,
              });
            }
          }
          return;
        }
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

      if (clickedId) {
        const element = elementos.find((el) => el.id === clickedId);
        if (element) {
          setSelectedElementId(clickedId);
          const pos = getMousePosition(e);
          setIsDraggingElement(true);
          setDragElementStart({
            mouseX: pos.x,
            mouseY: pos.y,
            initialPos: { ...element },
          });
          return;
        }
      }

      const pos = getMousePosition(e);
      setIsBoxSelecting(true);
      setBoxSelectStart(pos);
      setBoxSelectRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  };

  const resizeRectangulo = (
    anchorX: number,
    anchorY: number,
    mouseX: number,
    mouseY: number,
    origW: number,
    origH: number,
    shiftKey: boolean,
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

  const resizeRectanguloRotado = (
    handleType: string,
    anchorCanvas: { x: number; y: number },
    mouseCanvas: { x: number; y: number },
    initialW: number,
    initialH: number,
    degres: number,
    shiftKey: boolean,
  ) => {
    const θ = degToRad(degres);
    const cosθ = Math.cos(θ);
    const sinθ = Math.sin(θ);

    const cx = (anchorCanvas.x + mouseCanvas.x) / 2;
    const cy = (anchorCanvas.y + mouseCanvas.y) / 2;
    const dx = mouseCanvas.x - anchorCanvas.x;
    const dy = mouseCanvas.y - anchorCanvas.y;

    let w = dx * cosθ + dy * sinθ;
    let h = -dx * sinθ + dy * cosθ;

    if (shiftKey && initialW > 0 && initialH > 0) {
      const ratioW = w / initialW;
      const ratioH = h / initialH;
      if (Math.abs(ratioW) >= Math.abs(ratioH)) {
        h = initialH * ratioW;
      } else {
        w = initialW * ratioH;
      }
    }

    switch (handleType) {
      case "nw":
        w = -w;
        h = -h;
        break;
      case "ne":
        h = -h;
        break;
      case "sw":
        w = -w;
        break;
    }

    return {
      x: cx - Math.abs(w) / 2,
      y: cy - Math.abs(h) / 2,
      width: Math.abs(w),
      height: Math.abs(h),
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      isResizing &&
      resizeStart &&
      resizeHandle &&
      herramientaActual === "seleccionar"
    ) {
      const pos = getMousePosition(e);
      const el = resizeStart.initialElement;
      setTooltipPos({ x: e.clientX, y: e.clientY });

      let updated: VectorElement;

      switch (el.tipo) {
        case "imagen":
        case "rectangulo": {
          const {
            x: origX,
            y: origY,
            width: origW,
            height: origH,
            degres,
          } = el;
          if (degres !== 0) {
            const anchorMap: Record<string, string> = {
              se: "nw",
              nw: "se",
              ne: "sw",
              sw: "ne",
            };
            const anchor = getCornerCanvasPos(
              origX,
              origY,
              origW,
              origH,
              degres,
              anchorMap[resizeHandle],
              0,
            );
            updated = {
              ...el,
              ...resizeRectanguloRotado(
                resizeHandle,
                anchor,
                pos,
                origW,
                origH,
                degres,
                e.shiftKey,
              ),
            };
          } else {
            let anchorX: number, anchorY: number;
            switch (resizeHandle) {
              case "se":
                anchorX = origX;
                anchorY = origY;
                break;
              case "nw":
                anchorX = origX + origW;
                anchorY = origY + origH;
                break;
              case "ne":
                anchorX = origX;
                anchorY = origY + origH;
                break;
              case "sw":
                anchorX = origX + origW;
                anchorY = origY;
                break;
              default:
                anchorX = origX;
                anchorY = origY;
            }
            updated = {
              ...el,
              ...resizeRectangulo(
                anchorX,
                anchorY,
                pos.x,
                pos.y,
                origW,
                origH,
                e.shiftKey,
              ),
            };
          }
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

    if (isRotating && rotateStart && herramientaActual === "seleccionar") {
      const pos = getMousePosition(e);
      setTooltipPos({ x: e.clientX, y: e.clientY });
      const currentAngle =
        (Math.atan2(pos.y - rotateStart.centerY, pos.x - rotateStart.centerX) *
          180) /
        Math.PI;
      const startAngle =
        (Math.atan2(
          rotateStart.mouseY - rotateStart.centerY,
          rotateStart.mouseX - rotateStart.centerX,
        ) *
          180) /
        Math.PI;
      const deltaDeg = currentAngle - startAngle;
      const newDegres =
        (((rotateStart.initialDegres + deltaDeg) % 360) + 360) % 360;
      const el = elementos.find((e) => e.id === selectedElementId);
      if (el && (el.tipo === "rectangulo" || el.tipo === "imagen")) {
        actualizarElemento(el.id, { ...el, degres: newDegres });
      }
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
        case "imagen":
        case "rectangulo":
          updated = { ...original, x: original.x + dx, y: original.y + dy };
          break;
        case "circulo":
          updated = { ...original, cx: original.cx + dx, cy: original.cy + dy };
          break;
      }
      actualizarElemento(original.id, updated);
    } else if (
      isMultiDragging &&
      multiDragStart &&
      herramientaActual === "seleccionar"
    ) {
      const pos = getMousePosition(e);
      const dx = pos.x - multiDragStart.mouseX;
      const dy = pos.y - multiDragStart.mouseY;
      for (const original of multiDragStart.initialPositions) {
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
          case "imagen":
          case "rectangulo":
            updated = { ...original, x: original.x + dx, y: original.y + dy };
            break;
          case "circulo":
            updated = { ...original, cx: original.cx + dx, cy: original.cy + dy };
            break;
        }
        actualizarElemento(original.id, updated);
      }
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
        case "imagen":
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
    } else if (isBoxSelecting && boxSelectStart) {
      const pos = getMousePosition(e);
      const x = Math.min(boxSelectStart.x, pos.x);
      const y = Math.min(boxSelectStart.y, pos.y);
      const w = Math.abs(pos.x - boxSelectStart.x);
      const h = Math.abs(pos.y - boxSelectStart.y);
      setBoxSelectRect({ x, y, w, h });
    }
  };

  const finalizeDrawing = () => {
    if (currentLocal) {
      if (currentLocal.tipo === "imagen") {
        if (currentLocal.width > 0 && currentLocal.height > 0) {
          if (!imagenCargada) {
            triggerWarning();
          } else {
            addElemento(currentLocal);
          }
        }
      } else {
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
    if (isRotating) {
      setIsRotating(false);
      setRotateStart(null);
    }
    if (isResizing) {
      endResize();
    }
    if (isDragging) {
      setIsDragging(false);
    }
    if (isDrawing) {
      finalizeDrawing();
    }
    if (isDraggingElement) setIsDraggingElement(false);
    if (isMultiDragging) {
      setIsMultiDragging(false);
      setMultiDragStart(null);
    }
    if (isBoxSelecting && boxSelectRect) {
      const ids: string[] = [];
      for (const el of elementos) {
        if (shouldSelectElement(el, boxSelectRect)) {
          ids.push(el.id);
        }
      }
      setMultiSelectedIds(ids);
      if (ids.length === 0) setSelectedElementId(null);
      setIsBoxSelecting(false);
      setBoxSelectStart(null);
      setBoxSelectRect(null);
    }
  };

  const handleMouseLeave = () => {
    if (isRotating) {
      setIsRotating(false);
      setRotateStart(null);
    }
    if (isResizing) endResize();
    if (isDragging) setIsDragging(false);
    if (isDrawing) finalizeDrawing();
    if (isDraggingElement) setIsDraggingElement(false);
    if (isMultiDragging) {
      setIsMultiDragging(false);
      setMultiDragStart(null);
    }
    if (isBoxSelecting) {
      setIsBoxSelecting(false);
      setBoxSelectStart(null);
      setBoxSelectRect(null);
    }
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
    if (isRotating) return "grabbing";
    if (isResizing && resizeHandle) {
      if (resizeHandle === "nw" || resizeHandle === "se") return "nwse-resize";
      if (resizeHandle === "ne" || resizeHandle === "sw") return "nesw-resize";
      if (resizeHandle === "p1" || resizeHandle === "p2") return "move";
    }
    if (herramientaActual === "mover") return isDragging ? "grabbing" : "grab";
    if (herramientaActual === "figuras") return "crosshair";
    if (herramientaActual === "seleccionar")
      return isDraggingElement || isMultiDragging ? "grabbing" : "default";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-800">
      <svg
        ref={svgRef}
        data-lienzo-svg
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
            const sel = el.id === selectedElementId || multiSelectedIds.includes(el.id);
            const showHandles = el.id === selectedElementId && multiSelectedIds.length === 0;
            const {
              offset: offsetSel,
              strokeWidth: swSel,
              handleRadius,
              rotationHandleDistance,
              rotationLineWidth,
            } = getHandleConfig(tamano);
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
                    {showHandles && (
                      <g>
                        <circle
                          data-handle-id="p1"
                          cx={el.x1}
                          cy={el.y1}
                          r={handleRadius * 0.4}
                          fill="#3b82f6"
                          cursor="move"
                        />
                        <circle
                          data-handle-id="p2"
                          cx={el.x2}
                          cy={el.y2}
                          r={handleRadius * 0.4}
                          fill="#3b82f6"
                          cursor="move"
                        />
                      </g>
                    )}
                  </g>
                );
              case "rectangulo":
                return (
                  <g key={el.id} data-element-id={el.id}>
                    <g
                      transform={`rotate(${el.degres}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`}
                    >
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
                        <rect
                          x={el.x - offsetSel}
                          y={el.y - offsetSel}
                          width={el.width + offsetSel * 2}
                          height={el.height + offsetSel * 2}
                          stroke="#3b82f6"
                          strokeWidth={swSel - 0.5}
                          fill="none"
                          pointerEvents="none"
                        />
                      )}
                      {showHandles && (() => {
                        const canvasCX = tamano / 2;
                        const canvasCY = tamano / 2;
                        const rectCX = el.x + el.width / 2;
                        const rectCY = el.y + el.height / 2;
                        const targetAngle = Math.atan2(canvasCY - rectCY, canvasCX - rectCX) * 180 / Math.PI;
                        const angleDiff = (a: number, b: number) => ((a - b) % 360 + 540) % 360 - 180;
                        const sides = [
                          { name: "bottom", angle: el.degres + 90 },
                          { name: "right", angle: el.degres },
                          { name: "top", angle: el.degres - 90 },
                          { name: "left", angle: el.degres + 180 },
                        ];
                        let closest = sides[0];
                        let minDiff = Math.abs(angleDiff(targetAngle, closest.angle));
                        for (let i = 1; i < sides.length; i++) {
                          const diff = Math.abs(angleDiff(targetAngle, sides[i].angle));
                          if (diff < minDiff) {
                            minDiff = diff;
                            closest = sides[i];
                          }
                        }
                        const dist = rotationHandleDistance;
                        let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0, hx = 0, hy = 0;
                        switch (closest.name) {
                          case "bottom":
                            lx1 = lx2 = el.x + el.width / 2;
                            ly1 = el.y + el.height + offsetSel;
                            ly2 = ly1 + dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "right":
                            lx1 = el.x + el.width + offsetSel;
                            ly1 = ly2 = el.y + el.height / 2;
                            lx2 = lx1 + dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "top":
                            lx1 = lx2 = el.x + el.width / 2;
                            ly1 = el.y - offsetSel;
                            ly2 = ly1 - dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "left":
                            lx1 = el.x - offsetSel;
                            ly1 = ly2 = el.y + el.height / 2;
                            lx2 = lx1 - dist;
                            hx = lx2; hy = ly2;
                            break;
                        }
                        return (
                          <>
                            <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#10b981" strokeWidth={rotationLineWidth} />
                            <circle data-handle-id="rotate" cx={hx} cy={hy} r={handleRadius * 0.5} fill="#10b981" cursor="grab" />
                          </>
                        );
                      })()}
                      {showHandles && (
                        <>
                          <circle
                            data-handle-id="nw"
                            cx={el.x - offsetSel}
                            cy={el.y - offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nwse-resize"
                          />
                          <circle
                            data-handle-id="ne"
                            cx={el.x + el.width + offsetSel}
                            cy={el.y - offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nesw-resize"
                          />
                          <circle
                            data-handle-id="se"
                            cx={el.x + el.width + offsetSel}
                            cy={el.y + el.height + offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nwse-resize"
                          />
                          <circle
                            data-handle-id="sw"
                            cx={el.x - offsetSel}
                            cy={el.y + el.height + offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nesw-resize"
                          />
                        </>
                      )}
                    </g>
                  </g>
                );
              case "imagen":
                return (
                  <g key={el.id} data-element-id={el.id}>
                    <g
                      transform={`rotate(${el.degres}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`}
                    >
                      <image
                        href={el.src}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        preserveAspectRatio="none"
                      />
                      {sel && (
                        <rect
                          x={el.x - offsetSel}
                          y={el.y - offsetSel}
                          width={el.width + offsetSel * 2}
                          height={el.height + offsetSel * 2}
                          stroke="#3b82f6"
                          strokeWidth={swSel - 0.5}
                          fill="none"
                          pointerEvents="none"
                        />
                      )}
                      {showHandles && (() => {
                        const canvasCX = tamano / 2;
                        const canvasCY = tamano / 2;
                        const rectCX = el.x + el.width / 2;
                        const rectCY = el.y + el.height / 2;
                        const targetAngle = Math.atan2(canvasCY - rectCY, canvasCX - rectCX) * 180 / Math.PI;
                        const angleDiff = (a: number, b: number) => ((a - b) % 360 + 540) % 360 - 180;
                        const sides = [
                          { name: "bottom", angle: el.degres + 90 },
                          { name: "right", angle: el.degres },
                          { name: "top", angle: el.degres - 90 },
                          { name: "left", angle: el.degres + 180 },
                        ];
                        let closest = sides[0];
                        let minDiff = Math.abs(angleDiff(targetAngle, closest.angle));
                        for (let i = 1; i < sides.length; i++) {
                          const diff = Math.abs(angleDiff(targetAngle, sides[i].angle));
                          if (diff < minDiff) {
                            minDiff = diff;
                            closest = sides[i];
                          }
                        }
                        const dist = rotationHandleDistance;
                        let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0, hx = 0, hy = 0;
                        switch (closest.name) {
                          case "bottom":
                            lx1 = lx2 = el.x + el.width / 2;
                            ly1 = el.y + el.height + offsetSel;
                            ly2 = ly1 + dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "right":
                            lx1 = el.x + el.width + offsetSel;
                            ly1 = ly2 = el.y + el.height / 2;
                            lx2 = lx1 + dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "top":
                            lx1 = lx2 = el.x + el.width / 2;
                            ly1 = el.y - offsetSel;
                            ly2 = ly1 - dist;
                            hx = lx2; hy = ly2;
                            break;
                          case "left":
                            lx1 = el.x - offsetSel;
                            ly1 = ly2 = el.y + el.height / 2;
                            lx2 = lx1 - dist;
                            hx = lx2; hy = ly2;
                            break;
                        }
                        return (
                          <>
                            <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#10b981" strokeWidth={rotationLineWidth} />
                            <circle data-handle-id="rotate" cx={hx} cy={hy} r={handleRadius * 0.5} fill="#10b981" cursor="grab" />
                          </>
                        );
                      })()}
                      {showHandles && (
                        <>
                          <circle
                            data-handle-id="nw"
                            cx={el.x - offsetSel}
                            cy={el.y - offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nwse-resize"
                          />
                          <circle
                            data-handle-id="ne"
                            cx={el.x + el.width + offsetSel}
                            cy={el.y - offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nesw-resize"
                          />
                          <circle
                            data-handle-id="se"
                            cx={el.x + el.width + offsetSel}
                            cy={el.y + el.height + offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nwse-resize"
                          />
                          <circle
                            data-handle-id="sw"
                            cx={el.x - offsetSel}
                            cy={el.y + el.height + offsetSel}
                            r={handleRadius * 0.6}
                            fill="#3b82f6"
                            cursor="nesw-resize"
                          />
                        </>
                      )}
                    </g>
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
                              strokeWidth={swSel - 0.5}
                              fill="none"
                              pointerEvents="none"
                            />
                            {showHandles && (
                              <>
                                <circle
                                  data-handle-id="nw"
                                  cx={left}
                                  cy={top}
                                  r={handleRadius * 0.6}
                                  fill="#3b82f6"
                                  cursor="nwse-resize"
                                />
                                <circle
                                  data-handle-id="ne"
                                  cx={left + side}
                                  cy={top}
                                  r={handleRadius * 0.6}
                                  fill="#3b82f6"
                                  cursor="nesw-resize"
                                />
                                <circle
                                  data-handle-id="se"
                                  cx={left + side}
                                  cy={top + side}
                                  r={handleRadius * 0.6}
                                  fill="#3b82f6"
                                  cursor="nwse-resize"
                                />
                                <circle
                                  data-handle-id="sw"
                                  cx={left}
                                  cy={top + side}
                                  r={handleRadius * 0.6}
                                  fill="#3b82f6"
                                  cursor="nesw-resize"
                                />
                              </>
                            )}
                          </g>
                        );
                      })()}
                  </g>
                );
            }
          })}
          {boxSelectRect && (
            <rect
              x={boxSelectRect.x}
              y={boxSelectRect.y}
              width={boxSelectRect.w}
              height={boxSelectRect.h}
              fill="rgba(14, 165, 233, 0.15)"
              stroke="#0ea5e9"
              strokeWidth={1 / zoom}
              pointerEvents="none"
            />
          )}
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
          {currentLocal?.tipo === "imagen" && (
            <rect
              x={currentLocal.x}
              y={currentLocal.y}
              width={currentLocal.width}
              height={currentLocal.height}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="none"
              strokeDasharray="4,4"
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
      {(isResizing || isRotating) &&
        (() => {
          const selEl = selectedElementId
            ? elementos.find((el) => el.id === selectedElementId)
            : null;
          if (!selEl) return null;
          let texto = "";
          if (isRotating && (selEl.tipo === "rectangulo" || selEl.tipo === "imagen")) {
            texto = `${Math.round(selEl.degres)}°`;
          } else {
            switch (selEl.tipo) {
              case "imagen":
              case "rectangulo":
                texto = `${Math.round(selEl.width)} X ${Math.round(selEl.height)}`;
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
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(0,0,0,0.85)",
          color: "white",
          padding: "20px 32px",
          borderRadius: 12,
          fontSize: 20,
          fontWeight: 600,
          zIndex: 9999,
          pointerEvents: "none",
          fontFamily: "monospace",
          opacity: warningVisible ? 1 : 0,
          transition: "opacity 800ms ease-in-out",
        }}
      >
        Cargue una imagen primero
      </div>
    </div>
  );
}

export default Lienzo;
