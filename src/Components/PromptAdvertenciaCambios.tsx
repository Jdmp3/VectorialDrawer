interface Propiedades {
  mostrar: boolean;
  setMostrar: (v: boolean) => void;
  onGuardar: () => void;
  onIgnorar: () => void;
}

function PromptAdvertenciaCambios({
  mostrar,
  setMostrar,
  onGuardar,
  onIgnorar,
}: Propiedades) {
  const cerrar = () => setMostrar(false);

  return (
    <>
      {mostrar && (
        <div
          className="fixed inset-0 bg-black/50 z-[70]"
          onClick={cerrar}
        />
      )}

      <div
        className={`fixed left-1/2 top-1/2 -translate-y-1/2 bg-red-500 text-white mx-auto w-full max-w-sm p-6 sm:p-8 rounded-[20px] border-red-800 border-6 transition-all duration-300 ease-in-out z-[71] ${
          mostrar
            ? "-translate-x-1/2 opacity-100"
            : "translate-x-[100vw] opacity-0"
        }`}
      >
        <button
          onClick={cerrar}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-red-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <svg className="w-10 h-10 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>

          <div>
            <h2 className="text-lg font-bold">Cambios sin guardar</h2>
            <p className="text-sm text-red-100 mt-1">
              Tiene cambios que no se han guardado. ¿Qué desea hacer?
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                onGuardar();
              }}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                onIgnorar();
              }}
              className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PromptAdvertenciaCambios;
