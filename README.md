# Proyecto de Monitoreo de Sensores

Aplicacion con arquitectura separada en backend (Python/FastAPI) y frontend (React + Vite) para visualizacion y monitoreo de sensores.

## Estructura

```text
backend/
frontend/
```

## Requisitos

- Python 3.10+
- Node.js 18+
- npm 9+

## Instalacion

### 1) Backend

Desde la raiz del proyecto:

```bash
python -m venv .venv
```

Activar entorno virtual:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

### 2) Frontend

```bash
cd frontend
npm install
```

## Ejecucion

### Backend

```bash
cd backend
uvicorn main:app --reload
```

### Frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

## Notas

- El archivo `requirements.txt` en la raiz referencia `backend/requirements.txt` para centralizar la instalacion.
- El frontend se ejecuta con Vite y normalmente queda disponible en `http://localhost:5173`.
