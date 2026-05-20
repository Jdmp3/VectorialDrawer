import { createContext } from "react";

export interface Stroke {
  puntos: { x: number; y: number }[];
  color: string;
  grosor: number;
}

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
  herramientaActual: "lapiz" | "mover";
  setHerramientaActual: (h: "lapiz" | "mover") => void;
  colorLapiz: string;
  setColorLapiz: (color: string) => void;
  grosorLapiz: number;
  setGrosorLapiz: (grosor: number) => void;
  strokes: Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  addStroke: (stroke: Stroke) => void;
  clearStrokes: () => void;
  currentStroke: { x: number; y: number }[] | null;
  setCurrentStroke: (puntos: { x: number; y: number }[] | null) => void;
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
  colorLapiz: "#000000",
  setColorLapiz: () => {},
  grosorLapiz: 2,
  setGrosorLapiz: () => {},
  strokes: [],
  setStrokes: () => {},
  addStroke: () => {},
  clearStrokes: () => {},
  currentStroke: null,
  setCurrentStroke: () => {},
});