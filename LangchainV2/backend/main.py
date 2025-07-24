from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from src.backend_core import QueryExecutor
import uvicorn
import pandas as pd
import uuid
from concurrent.futures import ThreadPoolExecutor
import asyncio
from src.generative_ai import PROMPT

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware
app.add_middleware(SessionMiddleware, secret_key="<Random Secret key for session>", session_cookie="procurement_session", max_age=86400)

# Thread pool for running synchronous tasks
executor = ThreadPoolExecutor(max_workers=10)  # Adjust based on load

class QueryRequest(BaseModel):
    question: str

async def run_in_thread(sync_func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, lambda: sync_func(*args, **kwargs))

@app.post("/query")
async def query_handler(request: Request, query: QueryRequest):
    session = request.session
    question = query.question
    prompt = PROMPT.format(question=question)

    print("Prompt is", prompt)
    print("Session is", session)

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Ensure a unique session ID exists
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
        session["context"] = []

    # Retrieve or initialize session context
    context_summary = "\n\n".join(session.get("context", [])[-4:])

    query_executor = QueryExecutor()
    # Run synchronous execute in a separate thread
    result = await run_in_thread(query_executor.execute, prompt=prompt, context_summary=context_summary)

    # Log the result for debugging
    print("QueryExecutor result:", result)

    # Update session context with a fallback if context_summary is missing or empty
    if "context_summary" in result and result["context_summary"]:
        session["context"] = session.get("context", []) + [result["context_summary"]]
    else:
        # Fallback: Create a basic context summary from result to ensure history is stored
        po_ids = []
        if result.get("query_df") is not None and not result["query_df"].empty:
            po_ids = result["query_df"].get("po_id", []).tolist()
        fallback_summary = f"Query: {question}\nPO IDs: {', '.join(map(str, po_ids)) if po_ids else 'None'}\nResult: {result.get('result', 'No result')}"
        session["context"] = session.get("context", []) + [fallback_summary]
    session["context"] = session["context"][-4:]  # Keep last 4 entries

    # Log the updated context for debugging
    print("Updated session context:", session["context"])

    # Convert DataFrame to JSON-serializable format
    data = result.get("query_df")
    if data is not None and not data.empty:
        for col in data.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]']).columns:
            data[col] = data[col].apply(lambda x: x.isoformat() if pd.notnull(x) else None)
        data = data.to_dict(orient="records")
    else:
        data = []

    return JSONResponse(content={
        "prompt": prompt,
        "result": result.get("result"),
        "data": data,
        "error": result.get("error")
    })

@app.post("/clear-history")
async def clear_history(request: Request):
    session = request.session
    session["context"] = []
    print("Context cleared for session:", session["session_id"])
    return {"message": "Context history cleared"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)
