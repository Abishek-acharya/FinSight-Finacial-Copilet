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

2. Add your Groq API key to `backend/.env` as `GROQ_API_KEY=...`, then start the API:

   ```powershell
   python -m uvicorn main:app --reload --port 8000
   ```

3. In a separate terminal at the project root, start the frontend:

   ```powershell
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` and `/health` to the backend. The backend health endpoint is available at `http://localhost:8000/health`.

## Data and limitations

For each chat request, the frontend sends the current transactions, budget plans, and savings goals to the backend; the backend sends the prompt and financial context to Groq to generate a response. Keep API keys in `backend/.env` and do not enter sensitive data unless you are comfortable sending it to the configured provider.

Financial calculations are performed by local deterministic tools. The spending forecast is a weighted moving-average statistical baseline, not a machine-learning prediction. Financial education answers use the built-in keyword-retrieved knowledge base and show its source labels. The chat experience is not financial, tax, or legal advice.
