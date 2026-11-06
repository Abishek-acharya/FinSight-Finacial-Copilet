# FinSight AI

FinSight is a React/Vite finance dashboard with an optional FastAPI chat assistant. The assistant analyzes the finance store's transactions, budget plans, and savings goals; it can also create CSV, Excel, and PDF transaction reports.

## Run locally

1. In `backend`, create and activate a virtual environment, then install the backend dependencies:

   ```powershell
   cd backend
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

2. Add your Groq API key to `backend/.env` as `GROQ_API_KEY=...`, then start the API. The first run creates `backend/finsight.sqlite3` and seeds the demo account `demo@finsight.ai` / `demo1234`. If port 8000 is in use in your environment, use 8001 instead:

   ```powershell
   python -m uvicorn main:app --reload --port 8001
   ```

3. In a separate terminal at the project root, start the frontend:

   ```powershell
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` and `/health` to the backend. The backend health endpoint is available at `http://localhost:8001/health`.

## Data and limitations

Account registration and sign-in are handled by FastAPI. Passwords are stored as salted PBKDF2 hashes, bearer sessions are stored as hashes, and each user has a separate finance snapshot in SQLite. Existing browser-only sessions must sign in again after this upgrade. Set `FINSIGHT_DATABASE_PATH` to choose a different SQLite file location.

Statement files are parsed in the browser and are not uploaded. Confirmed transaction details and statement metadata are saved to the authenticated user's SQLite snapshot; later finance-store changes are synchronized to that snapshot. Chat requests send only the user's message: the backend retrieves that user's snapshot and sends the prompt and financial context to Groq. Keep API keys in `backend/.env` and do not enter sensitive data unless you are comfortable sending it to the configured provider. The demo credentials are intended only for local development.

Financial calculations are performed by local deterministic tools. The spending forecast is a weighted moving-average statistical baseline, not a machine-learning prediction. Financial education answers use the built-in keyword-retrieved knowledge base and show its source labels. The chat experience is not financial, tax, or legal advice.
