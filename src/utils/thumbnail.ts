import { VectorElement } from "../Components/ContextDeLienzo";

export function generarSVGMiniatura(
  tamano: number,
  colorLienzo: string,
  elementos: VectorElement[],
  escala: number = 120
): string {
  const proporcion = escala / tamano;

  const dibujarElemento = (el: VectorElement): string => {
    switch (el.tipo) {
      case "linea": {
        const x1 = el.x1 * proporcion;
        const y1 = el.y1 * proporcion;
        const x2 = el.x2 * proporcion;
        const y2 = el.y2 * proporcion;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${el.color}" stroke-width="${Math.max(el.grosor * proporcion, 0.5)}" stroke-linecap="round"/>`;
      }
      case "rectangulo": {
        const x = el.x * proporcion;
        const y = el.y * proporcion;
        const w = el.width * proporcion;
        const h = el.height * proporcion;
        const cx = x + w / 2;
        const cy = y + h / 2;
        return `<g transform="rotate(${el.degres}, ${cx}, ${cy})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${el.color}" stroke-width="${Math.max(el.grosor * proporcion, 0.5)}"/></g>`;
      }
      case "circulo": {
        const cx = el.cx * proporcion;
        const cy = el.cy * proporcion;
        const r = Math.max(el.r * proporcion, 1);
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${el.color}" stroke-width="${Math.max(el.grosor * proporcion, 0.5)}"/>`;
      }
      case "imagen": {
        const x = el.x * proporcion;
        const y = el.y * proporcion;
        const w = el.width * proporcion;
        const h = el.height * proporcion;
        return `<g transform="rotate(${el.degres}, ${x + w / 2}, ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#555" rx="1"/><text x="${x + w / 2}" y="${y + h / 2}" fill="#aaa" font-size="8" text-anchor="middle" dominant-baseline="central">img</text></g>`;
      }
      default:
        return "";
    }
  };

  const elementosSVG = elementos.map(dibujarElemento).join("\n    ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${escala} ${escala}" width="${escala}" height="${escala}">
    <rect width="${escala}" height="${escala}" fill="${colorLienzo}"/>
    ${elementosSVG}
  </svg>`;

  return svg;
}

export function miniaturaToDataURL(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
