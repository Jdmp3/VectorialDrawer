import { useState } from "react";

interface Propiedades {
  onNuevo: () => void;
  onGuardar: () => void;
  onCargar: () => void;
}

function MenuHamburguesa({ onNuevo, onGuardar, onCargar }: Propiedades) {
  const [abierto, setAbierto] = useState(false);

  const handleNuevo = () => {
    onNuevo();
    setAbierto(false);
  };

  const handleGuardar = () => {
    onGuardar();
    setAbierto(false);
  };

  const handleCargar = () => {
    onCargar();
    setAbierto(false);
  };

  return (
    <>
      {abierto && (
        <div
          className="fixed inset-0 bg-black/50 z-60"
          onClick={() => setAbierto(false)}
        />
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed top-4 left-4 z-[70] w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
      >
        {abierto ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 z-60 transform transition-transform duration-300 ease-in-out ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-4 pt-20 gap-3">
          <button
            onClick={handleNuevo}
            className="w-full px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo
          </button>

          <button
            onClick={handleGuardar}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Guardar
          </button>

          <button
            onClick={handleCargar}
            className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-stone-800 hover:text-white rounded-lg font-medium transition-colors flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a5 5 0 01-2 2z" />
            </svg>
            Cargar
          </button>
        </div>
      </div>
    </>
  );
}

export default MenuHamburguesa;
