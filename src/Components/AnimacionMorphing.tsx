interface Props {
  mostrar: boolean;
  lado: "izquierda" | "derecha";
}

function AnimacionMorphing({ mostrar, lado }: Props) {
  const posicionLeft =
    lado === "izquierda" ? "left-[calc(50%-380px)]" : "left-[calc(50%+316px)]";

  return (
    <div
      className={`morphing-decoration morphing-decoration-${lado} fixed ${posicionLeft} top-1/2 -translate-y-1/2 w-16 h-16 z-40 pointer-events-none transition-opacity`}
      style={{
        opacity: mostrar ? 0.1 : 0,
        transitionDuration: mostrar ? "80ms" : "600ms",
        transitionTimingFunction: mostrar ? "ease-out" : "ease-in-out",
      }}
    >
      <svg
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-50 w-full h-full"
      >
        <path>
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            values="
              M 5 40 L 6.2 30.9 L 9.7 22.5 L 15.3 15.3 L 22.5 9.7 L 30.9 6.2 L 40 5 L 49.1 6.2 L 57.5 9.7 L 64.7 15.3 L 70.3 22.5 L 73.8 30.9 L 75 40;
              M 5 40 L 5 28 L 5 16 L 5 5 L 16.7 5 L 28.3 5 L 40 5 L 51.7 5 L 63.3 5 L 75 5 L 75 16.7 L 75 28.3 L 75 40;
              M 5 25 L 10.8 25 L 16.7 25 L 22.5 25 L 28.3 25 L 34.2 25 L 40 25 L 45.8 25 L 51.7 25 L 57.5 25 L 63.3 25 L 69.2 25 L 75 25;
              M 5 40 L 6.2 49.1 L 9.7 57.5 L 15.3 64.7 L 22.5 70.3 L 30.9 73.8 L 40 75 L 49.1 73.8 L 57.5 70.3 L 64.7 64.7 L 70.3 57.5 L 73.8 49.1 L 75 40
            "
            keyTimes="0;0.33;0.66;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
          />
        </path>
        <path>
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            values="
              M 5 40 L 6.2 49.1 L 9.7 57.5 L 15.3 64.7 L 22.5 70.3 L 30.9 73.8 L 40 75 L 49.1 73.8 L 57.5 70.3 L 64.7 64.7 L 70.3 57.5 L 73.8 49.1 L 75 40;
              M 5 40 L 5 52 L 5 64 L 5 75 L 16.7 75 L 28.3 75 L 40 75 L 51.7 75 L 63.3 75 L 75 75 L 75 63.3 L 75 51.7 L 75 40;
              M 5 55 L 10.8 55 L 16.7 55 L 22.5 55 L 28.3 55 L 34.2 55 L 40 55 L 45.8 55 L 51.7 55 L 57.5 55 L 63.3 55 L 69.2 55 L 75 55;
              M 5 40 L 6.2 30.9 L 9.7 22.5 L 15.3 15.3 L 22.5 9.7 L 30.9 6.2 L 40 5 L 49.1 6.2 L 57.5 9.7 L 64.7 15.3 L 70.3 22.5 L 73.8 30.9 L 75 40
            "
            keyTimes="0;0.33;0.66;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
          />
        </path>
      </svg>
    </div>
  );
}

export default AnimacionMorphing;
