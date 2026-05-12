import { createContext } from "react";

interface LienzoContextType {
  ancho: number;
  alto: number;
  setAncho: (value: number) => void;
  setAlto: (value: number) => void;
}

export const LienzoContext = createContext<LienzoContextType>({
  ancho: 400,
  alto: 800,
  setAncho: () => {},
  setAlto: () => {},
});