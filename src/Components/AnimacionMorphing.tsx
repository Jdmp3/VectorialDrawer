interface Props {
  mostrar: boolean;
  lado: "izquierda" | "derecha";
}

function AnimacionMorphing({ mostrar, lado }: Props) {
  const posicionLeft = lado === "izquierda" ? "left-[calc(50%-380px)]" : "left-[calc(50%+316px)]";

  return (
    <div
      className={`fixed ${posicionLeft} top-1/2 -translate-y-1/2 w-16 h-16 z-40 pointer-events-none transition-opacity`}
      style={{
        opacity: mostrar ? 0.6 : 0,
        transitionDuration: mostrar ? "80ms" : "600ms",
        transitionTimingFunction: mostrar ? "ease-out" : "ease-in-out",
      }}
    >
      <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-amber-50 w-full h-full">
        <path>
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M 5 40 L 17 17 L 40 5 L 63 17 L 75 40;
              M 5 40 L 5 5 L 40 5 L 75 5 L 75 40;
              M 5 25 L 22 25 L 40 25 L 58 25 L 75 25;
              M 5 40 L 5 5 L 40 5 L 75 5 L 75 40;
              M 5 40 L 17 17 L 40 5 L 63 17 L 75 40
            "
            keyTimes="0;0.25;0.5;0.75;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
          />
        </path>
        <path>
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M 5 40 L 17 63 L 40 75 L 63 63 L 75 40;
              M 5 40 L 5 75 L 40 75 L 75 75 L 75 40;
              M 5 55 L 22 55 L 40 55 L 58 55 L 75 55;
              M 5 40 L 5 75 L 40 75 L 75 75 L 75 40;
              M 5 40 L 17 63 L 40 75 L 63 63 L 75 40
            "
            keyTimes="0;0.25;0.5;0.75;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
          />
        </path>
      </svg>
    </div>
  );
}

export default AnimacionMorphing;
