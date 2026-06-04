import { useContext, useRef } from "react";
import { LienzoContext } from "./ContextDeLienzo";

function BotonCargarImagen() {
  const { herramientaActual, figuraTipo, setImagenCargada, imagenCargada } =
    useContext(LienzoContext);
  const inputRef = useRef<HTMLInputElement>(null);

  if (herramientaActual !== "figuras" || figuraTipo !== "imagen") return null;

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagenCargada((ev.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        className="px-4 py-2 rounded-lg font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors shadow-lg"
      >
        {imagenCargada ? "Imagen cargada" : "Cargar"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default BotonCargarImagen;
