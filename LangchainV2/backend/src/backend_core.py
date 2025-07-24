# backend_core.py
from src.generative_ai import SQLNaturaLanguage

class QueryExecutor:
    def __init__(self, temperature=0, model="gemini-2.5-flash"):
        self.agent = SQLNaturaLanguage(temperature=temperature, model=model)

    def execute(self, prompt: str, context_summary: str = None):
        return self.agent.execution(prompt=prompt, context_summary=context_summary)