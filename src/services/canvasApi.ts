import { VectorElement } from "../Components/ContextDeLienzo";

export interface DatosLienzo {
  tamano: number;
  colorLienzo: string;
  elementos: VectorElement[];
}

export interface DatosGuardados extends DatosLienzo {
  guardadoEn: string;
}

export interface RegistroEspacio extends DatosGuardados {
  espacio: number;
}

interface RespuestaSubidaImagen {
  key: string;
  uploadUrl: string;
  viewUrl: string;
}

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
const CLAVE_MIGRACION = "vectorial_postgres_migrado_v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("No se pudo conectar con el servicio.");
  }

  if (!response.ok) {
    let message = `El servicio respondió con estado ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Mantener el mensaje HTTP si el backend no respondió JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listarEspacios(): Promise<Array<RegistroEspacio | null>> {
  return request<Array<RegistroEspacio | null>>("/api/slots");
}

export function guardarEspacio(
  espacio: number,
  datos: DatosLienzo
): Promise<RegistroEspacio> {
  return request<RegistroEspacio>(`/api/slots/${espacio}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function borrarEspacio(espacio: number): Promise<void> {
  return request<void>(`/api/slots/${espacio}`, { method: "DELETE" });
}

export async function subirImagen(file: File): Promise<{ storageKey: string; src: string }> {
  const { key, uploadUrl, viewUrl } = await request<RespuestaSubidaImagen>(
    "/api/images/upload-url",
    {
      method: "POST",
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    }
  );
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new Error("No se pudo conectar para subir la imagen.");
  }
  if (!response.ok) {
    throw new Error("El servicio rechazó la subida de la imagen.");
  }
  return { storageKey: key, src: viewUrl };
}

interface ResultadoInicializacion {
  espacios: Array<RegistroEspacio | null>;
  conflictoMigracion: boolean;
}

let inicializacionPendiente: Promise<ResultadoInicializacion> | null = null;

export function inicializarEspacios(): Promise<ResultadoInicializacion> {
  if (!inicializacionPendiente) {
    inicializacionPendiente = ejecutarInicializacion().catch((error: unknown) => {
      inicializacionPendiente = null;
      throw error;
    });
  }
  return inicializacionPendiente;
}

async function ejecutarInicializacion(): Promise<ResultadoInicializacion> {
  const espacios = await listarEspacios();
  if (localStorage.getItem(CLAVE_MIGRACION) === "completada") {
    return { espacios, conflictoMigracion: false };
  }

  const espaciosAntiguos = Array.from({ length: 9 }, (_, espacio) => {
    try {
      const raw = localStorage.getItem(`vectorial_slot_${espacio}`);
      if (!raw) return null;
      const datos = JSON.parse(raw) as DatosGuardados;
      if (
        !Number.isFinite(datos.tamano) ||
        typeof datos.colorLienzo !== "string" ||
        !Array.isArray(datos.elementos) ||
        typeof datos.guardadoEn !== "string"
      ) {
        return null;
      }
      return { espacio, datos };
    } catch {
      return null;
    }
  }).filter((slot): slot is { espacio: number; datos: DatosGuardados } => slot !== null);

  if (espaciosAntiguos.length === 0) {
    localStorage.setItem(CLAVE_MIGRACION, "completada");
    return { espacios, conflictoMigracion: false };
  }

  if (espacios.some((slot) => slot !== null)) {
    localStorage.setItem(CLAVE_MIGRACION, "completada");
    return { espacios, conflictoMigracion: true };
  }

  try {
    await request<void>("/api/slots/migrate", {
      method: "POST",
      body: JSON.stringify(
        espaciosAntiguos.map(({ espacio, datos }) => ({
          espacio,
          datos: {
            tamano: datos.tamano,
            colorLienzo: datos.colorLienzo,
            elementos: datos.elementos,
          },
          guardadoEn: datos.guardadoEn,
        }))
      ),
    });
    localStorage.setItem(CLAVE_MIGRACION, "completada");
    return { espacios: await listarEspacios(), conflictoMigracion: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes("ya contiene datos")) {
      localStorage.setItem(CLAVE_MIGRACION, "completada");
      return { espacios: await listarEspacios(), conflictoMigracion: true };
    }
    throw error;
  }
}
