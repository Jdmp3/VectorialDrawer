import { useState } from "react";

interface Propiedades {
  onNuevo: () => void;
}

function MenuHamburguesa({ onNuevo }: Propiedades) {
  const [abierto, setAbierto] = useState(false);

  const handleNuevo = () => {
    onNuevo();
    setAbierto(false);
  };

  return (
    <>
      {abierto && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setAbierto(false)}
        />
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
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
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 z-40 transform transition-transform duration-300 ease-in-out ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-4 pt-20">
          <button
            onClick={handleNuevo}
            className="w-full px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
          >
            Nuevo
          </button>
        </div>
      </div>
    </>
  );
}

export default MenuHamburguesa;
