package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const (
	defaultS3Bucket = "imagenesdelienzos10"
	defaultS3Region = "us-east-2"
	maxImageBytes   = 20 << 20
)

type imageStorage struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
}

type uploadURLRequest struct {
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

type uploadURLResponse struct {
	Key       string `json:"key"`
	UploadURL string `json:"uploadUrl"`
	ViewURL   string `json:"viewUrl"`
}

func newImageStorage(ctx context.Context) (*imageStorage, error) {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = defaultS3Region
	}
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		bucket = defaultS3Bucket
	}
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("cargar configuración AWS: %w", err)
	}
	client := s3.NewFromConfig(cfg)
	return &imageStorage{client: client, presign: s3.NewPresignClient(client), bucket: bucket}, nil
}

func (s *server) crearURLSubidaImagen(w http.ResponseWriter, r *http.Request) {
	var request uploadURLRequest
	if err := leerJSON(w, r, &request); err != nil {
		writeError(w, http.StatusBadRequest, "La solicitud de subida no es válida")
		return
	}
	if request.Size <= 0 || request.Size > maxImageBytes || !tipoImagenPermitido(request.ContentType) {
		writeError(w, http.StatusBadRequest, "La imagen debe ser JPG, PNG, WebP o GIF y pesar hasta 20 MB")
		return
	}
	key := "pending/" + nuevoID()
	result, err := s.storage.presign.PresignPutObject(r.Context(), &s3.PutObjectInput{
		Bucket: aws.String(s.storage.bucket), Key: aws.String(key), ContentType: aws.String(request.ContentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		writeError(w, http.StatusBadGateway, "No se pudo preparar la subida a S3")
		return
	}
	view, err := s.storage.presign.PresignGetObject(r.Context(), &s3.GetObjectInput{
		Bucket: aws.String(s.storage.bucket), Key: aws.String(key),
	}, s3.WithPresignExpires(7*24*time.Hour))
	if err != nil {
		writeError(w, http.StatusBadGateway, "No se pudo preparar la lectura temporal de la imagen")
		return
	}
	writeJSON(w, http.StatusOK, uploadURLResponse{Key: key, UploadURL: result.URL, ViewURL: view.URL})
}

func tipoImagenPermitido(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "image/jpeg", "image/png", "image/webp", "image/gif":
		return true
	default:
		return false
	}
}

func (s *server) firmarImagenes(ctx context.Context, registro *slotRecord) error {
	for i, raw := range registro.Elementos {
		var element map[string]json.RawMessage
		if err := json.Unmarshal(raw, &element); err != nil {
			return err
		}
		var kind string
		_ = json.Unmarshal(element["tipo"], &kind)
		if kind != "imagen" || len(element["storageKey"]) == 0 {
			continue
		}
		var key string
		if err := json.Unmarshal(element["storageKey"], &key); err != nil || !validarKey(key, "images/") {
			return fmt.Errorf("clave de imagen inválida")
		}
		result, err := s.storage.presign.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(s.storage.bucket), Key: aws.String(key),
		}, s3.WithPresignExpires(7*24*time.Hour))
		if err != nil {
			return err
		}
		src, _ := json.Marshal(result.URL)
		element["src"] = src
		registro.Elementos[i], err = json.Marshal(element)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *server) prepararImagenes(ctx context.Context, espacio int, datos *canvasData) ([]string, error) {
	var nuevos []string
	normalizadas := make(map[string]string)
	for i, raw := range datos.Elementos {
		var element map[string]json.RawMessage
		if err := json.Unmarshal(raw, &element); err != nil {
			return nuevos, err
		}
		var kind string
		_ = json.Unmarshal(element["tipo"], &kind)
		if kind != "imagen" {
			continue
		}
		var key string
		if len(element["storageKey"]) > 0 {
			if err := json.Unmarshal(element["storageKey"], &key); err != nil {
				return nuevos, err
			}
		}
		referenciaOriginal := key
		if key == "" {
			var src string
			if err := json.Unmarshal(element["src"], &src); err != nil {
				return nuevos, fmt.Errorf("imagen sin origen")
			}
			if !strings.HasPrefix(src, "data:") {
				return nuevos, fmt.Errorf("imagen sin clave S3")
			}
			referenciaOriginal = src
			key = normalizadas[src]
			if key == "" {
				var err error
				key, err = s.subirDataURL(ctx, espacio, src)
				if err != nil {
					return nuevos, err
				}
				nuevos = append(nuevos, key)
				normalizadas[src] = key
			}
		} else if reemplazo := normalizadas[key]; reemplazo != "" {
			key = reemplazo
		} else if strings.HasPrefix(key, "pending/") {
			if !validarKey(key, "pending/") {
				return nuevos, fmt.Errorf("clave S3 inválida")
			}
			permanent := fmt.Sprintf("images/slot-%d/%s", espacio, nuevoID())
			_, err := s.storage.client.CopyObject(ctx, &s3.CopyObjectInput{
				Bucket: aws.String(s.storage.bucket), Key: aws.String(permanent),
				CopySource: aws.String(s.storage.bucket + "/" + key), MetadataDirective: types.MetadataDirectiveCopy,
			})
			if err != nil {
				return nuevos, err
			}
			nuevos = append(nuevos, permanent)
			if _, err := s.storage.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.storage.bucket), Key: aws.String(key)}); err != nil {
				_, _ = s.storage.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.storage.bucket), Key: aws.String(permanent)})
				return nuevos, err
			}
			key = permanent
			normalizadas[referenciaOriginal] = key
		} else if !validarKey(key, "images/") {
			return nuevos, fmt.Errorf("clave S3 inválida")
		} else if !strings.HasPrefix(key, fmt.Sprintf("images/slot-%d/", espacio)) {
			permanent := fmt.Sprintf("images/slot-%d/%s", espacio, nuevoID())
			_, err := s.storage.client.CopyObject(ctx, &s3.CopyObjectInput{
				Bucket: aws.String(s.storage.bucket), Key: aws.String(permanent),
				CopySource: aws.String(s.storage.bucket + "/" + key), MetadataDirective: types.MetadataDirectiveCopy,
			})
			if err != nil {
				return nuevos, err
			}
			key = permanent
			nuevos = append(nuevos, key)
			normalizadas[referenciaOriginal] = key
		} else {
			normalizadas[referenciaOriginal] = key
		}
		keyJSON, _ := json.Marshal(key)
		element["storageKey"] = keyJSON
		if srcJSON, err := json.Marshal("s3://" + s.storage.bucket + "/" + key); err == nil {
			element["src"] = srcJSON
		}
		encoded, err := json.Marshal(element)
		if err != nil {
			return nuevos, err
		}
		datos.Elementos[i] = encoded
	}
	return nuevos, nil
}

func (s *server) subirDataURL(ctx context.Context, espacio int, value string) (string, error) {
	comma := strings.IndexByte(value, ',')
	if comma < 0 || !strings.HasSuffix(value[:comma], ";base64") {
		return "", fmt.Errorf("formato de imagen antigua inválido")
	}
	contentType := strings.TrimPrefix(strings.SplitN(value, ";", 2)[0], "data:")
	if !tipoImagenPermitido(contentType) {
		return "", fmt.Errorf("tipo de imagen no permitido")
	}
	data, err := base64.StdEncoding.DecodeString(value[comma+1:])
	if err != nil || len(data) == 0 || len(data) > maxImageBytes {
		return "", fmt.Errorf("imagen antigua inválida o demasiado grande")
	}
	key := fmt.Sprintf("images/slot-%d/%s", espacio, nuevoID())
	_, err = s.storage.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.storage.bucket), Key: aws.String(key), Body: bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	return key, err
}

func validarKey(key, prefix string) bool {
	return strings.HasPrefix(key, prefix) && !strings.Contains(key, "..") && len(key) <= 1024
}

func nuevoID() string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes[:])
}

func (s *server) prepareCleanupTable(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS s3_cleanup (object_key TEXT PRIMARY KEY, creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
	return err
}

func (s *server) procesarLimpiezaPendiente() {
	for {
		s.procesarLimpieza()
		time.Sleep(time.Minute)
	}
}

func (s *server) procesarLimpieza() {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `SELECT object_key FROM s3_cleanup ORDER BY creado_en LIMIT 100`)
	if err != nil {
		log.Printf("No se pudo leer la cola de limpieza S3: %v", err)
		return
	}
	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			_ = rows.Close()
			log.Printf("No se pudo leer una clave de limpieza S3: %v", err)
			return
		}
		keys = append(keys, key)
	}
	_ = rows.Close()
	for _, key := range keys {
		if !validarKey(key, "images/") {
			log.Printf("Se omitió una clave de limpieza S3 inválida")
			continue
		}
		_, err := s.storage.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.storage.bucket), Key: aws.String(key)})
		if err != nil {
			log.Printf("No se pudo borrar la imagen %s de S3; se reintentará: %v", key, err)
			continue
		}
		if _, err := s.db.ExecContext(ctx, `DELETE FROM s3_cleanup WHERE object_key = $1`, key); err != nil {
			log.Printf("No se pudo retirar la imagen %s de la cola S3: %v", key, err)
		}
	}
}

func (s *server) leerClavesEspacio(ctx context.Context, espacio int) ([]string, error) {
	return leerClavesEspacioTx(ctx, s.db, espacio)
}

type queryRower interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func leerClavesEspacioTx(ctx context.Context, querier queryRower, espacio int) ([]string, error) {
	var raw []byte
	err := querier.QueryRowContext(ctx, `SELECT datos FROM lienzo WHERE espacio = $1`, espacio).Scan(&raw)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var datos canvasData
	if err := json.Unmarshal(raw, &datos); err != nil {
		return nil, err
	}
	return clavesImagenes(datos.Elementos), nil
}

func clavesImagenes(elements []json.RawMessage) []string {
	seen := make(map[string]bool)
	var keys []string
	for _, raw := range elements {
		var element struct {
			Type string `json:"tipo"`
			Key  string `json:"storageKey"`
		}
		if json.Unmarshal(raw, &element) == nil && element.Type == "imagen" && validarKey(element.Key, "images/") && !seen[element.Key] {
			seen[element.Key] = true
			keys = append(keys, element.Key)
		}
	}
	return keys
}

func diferenciaClaves(oldKeys, newKeys []string) []string {
	current := make(map[string]bool, len(newKeys))
	for _, key := range newKeys {
		current[key] = true
	}
	var removed []string
	for _, key := range oldKeys {
		if !current[key] {
			removed = append(removed, key)
		}
	}
	return removed
}

func (s *server) eliminarNuevasImagenes(keys []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	for _, key := range keys {
		if !validarKey(key, "images/") {
			continue
		}
		if _, err := s.storage.client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s.storage.bucket), Key: aws.String(key),
		}); err != nil {
			log.Printf("No se pudo limpiar la imagen S3 %s: %v", key, err)
			if _, queueErr := s.db.ExecContext(ctx, `INSERT INTO s3_cleanup (object_key) VALUES ($1) ON CONFLICT DO NOTHING`, key); queueErr != nil {
				log.Printf("No se pudo encolar la limpieza de la imagen S3 %s: %v", key, queueErr)
			}
		}
	}
}
