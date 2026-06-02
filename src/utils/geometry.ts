export function getHandleConfig(tamano: number) {
  const f = 1 - 16 / tamano;
  return {
    offset: 1.8 + 2.2 * f,
    strokeWidth: 0.7 + 1.5 * f,
    handleRadius: 1.0 + 2.0 * f,
    linePad: 2.0 + 6.0 * f,
    lineSW: 0.6 + 3.0 * f,
    rotationHandleDistance: 3.0 + 3.0 * f,
    rotationLineWidth: 0.3 + 0.7 * f,
  };
}
