import { createContext } from "react";

export interface LineaShape {
  id: string;
  tipo: "linea";
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  grosor: number;
}

export interface RectShape {
  id: string;
  tipo: "rectangulo";
  x: number; y: number;
  width: number; height: number;
  color: string;
  grosor: number;
  degres: number;
}

export interface CircleShape {
  id: string;
  tipo: "circulo";
  cx: number; cy: number;
  r: number;
  color: string;
  grosor: number;
}

export type VectorElement = LineaShape | RectShape | CircleShape;

interface LienzoContextType {
  tamano: number;
  setTamano: (value: number) => void;
  colorLienzo: string;
  setColorLienzo: (color: string) => void;
  mostrarPrompt: boolean;
  offsetReal: { x: number; y: number };
  offsetRender: { x: number; y: number };
  setOffsetReal: (offset: { x: number; y: number }) => void;
  setOffsetRender: (offset: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  grosorBorde: number;
  setGrosorBorde: (grosor: number) => void;
  herramientaActual: "figuras" | "mover" | "seleccionar";
  setHerramientaActual: (h: "figuras" | "mover" | "seleccionar") => void;
  figuraTipo: "linea" | "rectangulo" | "circulo";
  setFiguraTipo: (t: "linea" | "rectangulo" | "circulo") => void;
  colorFigura: string;
  setColorFigura: (color: string) => void;
  grosorFigura: number;
  setGrosorFigura: (grosor: number) => void;
  elementos: VectorElement[];
  currentElement: VectorElement | null;
  setCurrentElement: (el: VectorElement | null) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  addElemento: (el: VectorElement) => void;
  actualizarElemento: (id: string, elemento: VectorElement) => void;
  clearElementos: () => void;
}

export const LienzoContext = createContext<LienzoContextType>({
  tamano: 16,
  setTamano: () => {},
  colorLienzo: "#3d3d3d",
  setColorLienzo: () => {},
  mostrarPrompt: true,
  offsetReal: { x: 0, y: 0 },
  offsetRender: { x: 0, y: 0 },
  setOffsetReal: () => {},
  setOffsetRender: () => {},
  zoom: 1,
  setZoom: () => {},
  grosorBorde: 0.1,
  setGrosorBorde: () => {},
  herramientaActual: "mover",
  setHerramientaActual: () => {},
  figuraTipo: "linea",
  setFiguraTipo: () => {},
  colorFigura: "#000000",
  setColorFigura: () => {},
  grosorFigura: 2,
  setGrosorFigura: () => {},
  elementos: [],
  currentElement: null,
  setCurrentElement: () => {},
  selectedElementId: null,
  setSelectedElementId: () => {},
  addElemento: () => {},
  actualizarElemento: () => {},
  clearElementos: () => {},
});
