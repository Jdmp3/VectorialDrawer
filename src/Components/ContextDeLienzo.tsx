import { createContext } from "react";

interface LienzoContextType {
  tamano: number;
  setTamano: (value: number) => void;
  mostrarPrompt: boolean;
  offset: { x: number; y: number };
  setOffset: (offset: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const LienzoContext = createContext<LienzoContextType>({
  tamano: 16,
  setTamano: () => {},
  mostrarPrompt: true,
  offset: { x: 0, y: 0 },
  setOffset: () => {},
  zoom: 1,
  setZoom: () => {},
});