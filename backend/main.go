package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const maxRequestSize = 50 << 20

type canvasData struct {
	Tamano      int               `json:"tamano"`
	ColorLienzo string            `json:"colorLienzo"`
	Elementos   []json.RawMessage `json:"elementos"`
}

type slotRecord struct {
	Espacio     int               `json:"espacio"`
	Tamano      int               `json:"tamano"`
	ColorLienzo string            `json:"colorLienzo"`
	Elementos   []json.RawMessage `json:"elementos"`
	GuardadoEn  time.Time         `json:"guardadoEn"`
}

type migrationEntry struct {
	Espacio    int        `json:"espacio"`
	Datos      canvasData `json:"datos"`
	GuardadoEn time.Time  `json:"guardadoEn"`
}

type server struct {
	db      *sql.DB
	storage *imageStorage
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL es obligatorio")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatalf("No se pudo configurar PostgreSQL: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("No se pudo conectar a PostgreSQL: %v", err)
	}
	if err := crearTabla(ctx, db); err != nil {
		log.Fatalf("No se pudo preparar la tabla lienzo: %v", err)
	}

	storage, err := newImageStorage(ctx)
	if err != nil {
		log.Fatalf("No se pudo configurar S3: %v", err)
	}
	api := &server{db: db, storage: storage}
	if err := api.prepareCleanupTable(ctx); err != nil {
		log.Fatalf("No se pudo preparar la cola de limpieza S3: %v", err)
	}
	go api.procesarLimpiezaPendiente()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", api.health)
	mux.HandleFunc("GET /api/slots", api.listarEspacios)
	mux.HandleFunc("GET /api/slots/{espacio}", api.cargarEspacio)
	mux.HandleFunc("PUT /api/slots/{espacio}", api.guardarEspacio)
	mux.HandleFunc("DELETE /api/slots/{espacio}", api.borrarEspacio)
	mux.HandleFunc("POST /api/slots/migrate", api.migrarEspacios)
	mux.HandleFunc("POST /api/images/upload-url", api.crearURLSubidaImagen)

	address := os.Getenv("API_ADDR")
	if address == "" {
		address = "127.0.0.1:8080" // Local

		if port := os.Getenv("PORT"); port != "" {
			address = "0.0.0.0:" + port // Render
		}
	}
	log.Printf("API lista en http://%s", address)
	log.Fatal(http.ListenAndServe(address, cors(mux)))
}

func crearTabla(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS lienzo (
			espacio SMALLINT PRIMARY KEY CHECK (espacio BETWEEN 0 AND 8),
			datos JSONB NOT NULL,
			guardado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`)
	return err
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.db.PingContext(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "PostgreSQL no está disponible")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) listarEspacios(w http.ResponseWriter, r *http.Request) {
	registros := make([]*slotRecord, 9)
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT espacio, datos, guardado_en FROM lienzo ORDER BY espacio`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudieron listar los espacios")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var espacio int
		var raw []byte
		var guardadoEn time.Time
		if err := rows.Scan(&espacio, &raw, &guardadoEn); err != nil {
			writeError(w, http.StatusInternalServerError, "No se pudieron leer los espacios")
			return
		}
		var datos canvasData
		if err := json.Unmarshal(raw, &datos); err != nil {
			writeError(w, http.StatusInternalServerError, "Hay datos de lienzo inválidos en PostgreSQL")
			return
		}
		registros[espacio] = &slotRecord{
			Espacio: espacio, Tamano: datos.Tamano, ColorLienzo: datos.ColorLienzo,
			Elementos: datos.Elementos, GuardadoEn: guardadoEn,
		}
		if err := s.firmarImagenes(r.Context(), registros[espacio]); err != nil {
			writeError(w, http.StatusInternalServerError, "No se pudieron preparar las imágenes del lienzo")
			return
		}
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudieron leer los espacios")
		return
	}
	writeJSON(w, http.StatusOK, registros)
}

func (s *server) cargarEspacio(w http.ResponseWriter, r *http.Request) {
	espacio, ok := leerIndice(w, r)
	if !ok {
		return
	}
	registro, err := s.obtenerEspacio(r.Context(), espacio)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "El espacio está vacío")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo cargar el lienzo")
		return
	}
	writeJSON(w, http.StatusOK, registro)
}

func (s *server) obtenerEspacio(ctx context.Context, espacio int) (*slotRecord, error) {
	var raw []byte
	registro := &slotRecord{Espacio: espacio}
	err := s.db.QueryRowContext(ctx,
		`SELECT datos, guardado_en FROM lienzo WHERE espacio = $1`, espacio,
	).Scan(&raw, &registro.GuardadoEn)
	if err != nil {
		return nil, err
	}
	var datos canvasData
	if err := json.Unmarshal(raw, &datos); err != nil {
		return nil, err
	}
	registro.Tamano = datos.Tamano
	registro.ColorLienzo = datos.ColorLienzo
	registro.Elementos = datos.Elementos
	if err := s.firmarImagenes(ctx, registro); err != nil {
		return nil, err
	}
	return registro, nil
}

func (s *server) guardarEspacio(w http.ResponseWriter, r *http.Request) {
	espacio, ok := leerIndice(w, r)
	if !ok {
		return
	}
	var datos canvasData
	if err := leerJSON(w, r, &datos); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no contiene JSON válido")
		return
	}
	if err := validarLienzo(datos); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	createdKeys, err := s.prepararImagenes(r.Context(), espacio, &datos)
	if err != nil {
		s.eliminarNuevasImagenes(createdKeys)
		writeError(w, http.StatusBadGateway, "No se pudieron preparar las imágenes en S3")
		return
	}
	saved := false
	defer func() {
		if !saved {
			s.eliminarNuevasImagenes(createdKeys)
		}
	}()
	actuales, err := s.leerClavesEspacio(r.Context(), espacio)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo revisar el lienzo anterior")
		return
	}
	nuevas := clavesImagenes(datos.Elementos)
	raw, err := json.Marshal(datos)
	if err != nil {
		writeError(w, http.StatusBadRequest, "No se pudieron procesar los datos del lienzo")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo iniciar el guardado del lienzo")
		return
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(r.Context(), `
		INSERT INTO lienzo (espacio, datos, guardado_en)
		VALUES ($1, $2::jsonb, NOW())
		ON CONFLICT (espacio) DO UPDATE
		SET datos = EXCLUDED.datos, guardado_en = NOW()`, espacio, string(raw))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo guardar el lienzo")
		return
	}
	for _, key := range diferenciaClaves(actuales, nuevas) {
		if _, err := tx.ExecContext(r.Context(), `INSERT INTO s3_cleanup (object_key) VALUES ($1) ON CONFLICT DO NOTHING`, key); err != nil {
			writeError(w, http.StatusInternalServerError, "No se pudo registrar la limpieza de imágenes anteriores")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo guardar el lienzo")
		return
	}
	saved = true
	go s.procesarLimpieza()
	registro, err := s.obtenerEspacio(r.Context(), espacio)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "El lienzo se guardó, pero no se pudo leer la respuesta")
		return
	}
	writeJSON(w, http.StatusOK, registro)
}

func (s *server) borrarEspacio(w http.ResponseWriter, r *http.Request) {
	espacio, ok := leerIndice(w, r)
	if !ok {
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo iniciar el borrado del lienzo")
		return
	}
	defer tx.Rollback()
	keys, err := leerClavesEspacioTx(r.Context(), tx, espacio)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudieron identificar las imágenes del lienzo")
		return
	}
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM lienzo WHERE espacio = $1`, espacio); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo borrar el lienzo")
		return
	}
	for _, key := range keys {
		if _, err := tx.ExecContext(r.Context(), `INSERT INTO s3_cleanup (object_key) VALUES ($1) ON CONFLICT DO NOTHING`, key); err != nil {
			writeError(w, http.StatusInternalServerError, "No se pudo registrar la limpieza de imágenes")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo borrar el lienzo")
		return
	}
	go s.procesarLimpieza()
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) migrarEspacios(w http.ResponseWriter, r *http.Request) {
	var entradas []migrationEntry
	if err := leerJSON(w, r, &entradas); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no contiene JSON válido")
		return
	}
	if len(entradas) == 0 || len(entradas) > 9 {
		writeError(w, http.StatusBadRequest, "La migración debe incluir entre 1 y 9 lienzos")
		return
	}
	vistos := make(map[int]bool, len(entradas))
	for _, entrada := range entradas {
		if entrada.Espacio < 0 || entrada.Espacio > 8 || vistos[entrada.Espacio] {
			writeError(w, http.StatusBadRequest, "La migración contiene espacios inválidos o repetidos")
			return
		}
		vistos[entrada.Espacio] = true
		if err := validarLienzo(entrada.Datos); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if entrada.GuardadoEn.IsZero() {
			writeError(w, http.StatusBadRequest, "La fecha de guardado de un lienzo no es válida")
			return
		}
	}
	var migradas []string
	for i := range entradas {
		created, err := s.prepararImagenes(r.Context(), entradas[i].Espacio, &entradas[i].Datos)
		migradas = append(migradas, created...)
		if err != nil {
			s.eliminarNuevasImagenes(migradas)
			writeError(w, http.StatusBadGateway, "No se pudieron migrar las imágenes antiguas a S3")
			return
		}
	}
	migracionCompletada := false
	defer func() {
		if !migracionCompletada {
			s.eliminarNuevasImagenes(migradas)
		}
	}()

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo iniciar la migración")
		return
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(r.Context(), `LOCK TABLE lienzo IN EXCLUSIVE MODE`); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo bloquear la tabla para migrar")
		return
	}
	var hayDatos bool
	if err := tx.QueryRowContext(r.Context(), `SELECT EXISTS (SELECT 1 FROM lienzo)`).Scan(&hayDatos); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo comprobar el estado de la tabla")
		return
	}
	if hayDatos {
		writeError(w, http.StatusConflict, "La tabla lienzo ya contiene datos; no se migró ningún espacio")
		return
	}

	for _, entrada := range entradas {
		raw, err := json.Marshal(entrada.Datos)
		if err != nil {
			writeError(w, http.StatusBadRequest, "No se pudieron procesar los datos de la migración")
			return
		}
		if _, err := tx.ExecContext(r.Context(), `
			INSERT INTO lienzo (espacio, datos, guardado_en)
			VALUES ($1, $2::jsonb, $3)`, entrada.Espacio, string(raw), entrada.GuardadoEn); err != nil {
			writeError(w, http.StatusInternalServerError, "Falló la migración; no se guardaron cambios parciales")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo completar la migración")
		return
	}
	migracionCompletada = true
	w.WriteHeader(http.StatusNoContent)
}

func validarLienzo(datos canvasData) error {
	if datos.Tamano <= 0 || datos.Tamano > 4096 {
		return fmt.Errorf("El tamaño del lienzo no es válido")
	}
	if strings.TrimSpace(datos.ColorLienzo) == "" {
		return fmt.Errorf("El color del lienzo es obligatorio")
	}
	if datos.Elementos == nil {
		return fmt.Errorf("La lista de figuras del lienzo es obligatoria")
	}
	for _, elemento := range datos.Elementos {
		var figura struct {
			ID   string `json:"id"`
			Tipo string `json:"tipo"`
		}
		if err := json.Unmarshal(elemento, &figura); err != nil || figura.ID == "" {
			return fmt.Errorf("El lienzo contiene una figura inválida")
		}
		switch figura.Tipo {
		case "linea", "rectangulo", "circulo", "imagen":
		default:
			return fmt.Errorf("El lienzo contiene un tipo de figura desconocido")
		}
	}
	return nil
}

func leerIndice(w http.ResponseWriter, r *http.Request) (int, bool) {
	espacio, err := strconv.Atoi(r.PathValue("espacio"))
	if err != nil || espacio < 0 || espacio > 8 {
		writeError(w, http.StatusBadRequest, "El número de espacio debe estar entre 0 y 8")
		return 0, false
	}
	return espacio, true
}

func leerJSON(w http.ResponseWriter, r *http.Request, destino any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestSize)
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(destino); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return errors.New("el cuerpo contiene valores JSON adicionales")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("No se pudo escribir la respuesta JSON: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func cors(next http.Handler) http.Handler {
	allowed := map[string]bool{
		"http://localhost:5173": true,
		"http://127.0.0.1:5173": true,
	}
	if configured := os.Getenv("CORS_ORIGINS"); configured != "" {
		for _, origin := range strings.Split(configured, ",") {
			allowed[strings.TrimSpace(origin)] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
