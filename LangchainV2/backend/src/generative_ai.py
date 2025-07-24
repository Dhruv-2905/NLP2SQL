import pandas as pd
import sqlalchemy as sql
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.sql_database import SQLDatabase
from langchain_experimental.sql import SQLDatabaseChain
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSequence
import re
import logging
import sys
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

INCLUDED_TABLES = os.getenv("INCLUDED_TABLES", "").split(",")

DISALLOWED_KEYWORDS = ["DROP", "DELETE", "ALTER", "TRUNCATE", "INSERT", "UPDATE"]

PROMPT = """
You are an expert SQL assistant. Translate the following natural language question into a SQL query for a PostgreSQL database. 
Ensure the query:
- Only uses views from the 'upeg' schema, specifically: 
- Always explicitly references the table name for each column (e.g., use upeg.purchase_order_main.column_name instead of just column_name) to avoid ambiguity, especially for columns that exist in multiple tables.
- Is safe, optimized, and follows PostgreSQL best practices.
- Avoid joins unless necessary
IMPORTANT!!!-Only return the sql query which I directly run and get back the response from the sql 

Consider these edge cases for better accuracy
Edge Case:
1. If complete information is asked try looking into the single table only rather than joining the different tables
2. Avoid joins unless it is clear data is available in two different tables 
3. Assume all date fields are stored as strings unless explicitly stated otherwise. Always convert them using TO_DATE(column_name, 'format') (e.g., 'DD-MM-YYYY') before comparing them to date functions like CURRENT_DATE or NOW()
4. Cast the timestamp column to text before using SUBSTRING or similar string operations.
5. When comparing string-based date columns with actual date values (e.g., CURRENT_DATE), always use TO_DATE(column_name, 'format') to ensure proper type casting and avoid errors related to data type mismatches or date format inconsistencies.
6. Update the query to cast the value to NUMERIC or FLOAT instead of INTEGER.
7. If question asked related to which order may delay or are at risk then look for the POs and their delivery address which is not null otherwise dont consider this point.
8. Avoid using item unless specifically asked 
Important- Never include prefix or suffix like ``` or the word 'sql' or the word 'SQLQuery' only include the raw sql query

Special Cases:
1. Use the Table purchase_order_item for the delivery related queries and the column purchase_order_id in that not the po_id
2. Always include item id whenever including any details about the item 

Important- Never include prefix or suffix like ``` or the word 'sql' or the word 'SQLQuery' only include the raw sql query
Very Important!- Always include additional supporting columns along with the main column to provide meaningful context and basic information (e.g., if returning PO IDs, also include PO amount, creation date, buyer name, etc.), depending on what the main column represents.
Question: {question}
"""

def clean_sql_query(sql):
    sql = sql.replace("`", "")
    sql = re.sub(r"\bsql\b", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"^SQLQuery:\s*", "", sql, flags=re.IGNORECASE)
    for keyword in DISALLOWED_KEYWORDS:
        if re.search(rf"\b{keyword}\b", sql, flags=re.IGNORECASE):
            raise ValueError(f"Query contains a disallowed keyword: {keyword}")
    return sql.strip()

class SQLNaturaLanguage():
    def __init__(self, temperature=0, model="gemini-2.5-flash"):
        db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
        sql_engine = sql.create_engine(db_url)
        self.db = SQLDatabase(
            engine=sql_engine,
            include_tables=INCLUDED_TABLES,
            schema=os.getenv("POSTGRES_SCHEMA"),
            view_support = True
        )
        self.conn = sql_engine.connect()
        self.API_KEY = os.getenv("GOOGLE_API_KEY")
        self.temperature = temperature
        self.model = model
        self.llm = self.__create_model()
        self.sql_model = self.__create_sqlchain()
        self.summary_model = self.__create_summary_chain()

    def __create_model(self):
        return ChatGoogleGenerativeAI(
            temperature=self.temperature,
            model=self.model,
            google_api_key=self.API_KEY
        )

    def __create_sqlchain(self):
        return SQLDatabaseChain.from_llm(
            llm=self.llm,
            db=self.db,
            verbose=True,
            return_intermediate_steps=True,
            top_k=50  # Reduced for performance
        )

    def __create_summary_chain(self):
        prompt_template = PromptTemplate(
            input_variables=["question", "table", "count", "date"],
            template="""
You are a procurement data analyst.
Given the following procurement table data and question, provide a concise summary in markdown format.
Start with a one-line summary (10–15 words) of the data insight, using count = {count}.

- Use count = {count} for total records.
- Organize by Purchase Order ID if po_id or purchase_order_id is present, else by row.
- Use format: **For Purchase Order ID: <id>** or **Row <n>**, with * <Column Name>: <Value> for each column.
- Capitalize column names, replace underscores with spaces (e.g., po_price_total -> PO Price Total).
- Format dates as YYYY-MM-DD.
- Use Indian number system for numbers (e.g., 1,00,000).
- Exclude previous context from the output; use it only for query context.
- Omit SQL query, warnings, or errors.
- Show delivery risk analysis only if "orders at risk" or "delay" is in the question.
- Use {date} for date-related questions.
- Include all columns dynamically.
- Summarize briefly if count > 10, avoiding row-by-row details.

Important - Always give in points never a paragraph and make sure to keep everything in markdown format 

Data:
{table}

Question:
{question}
"""
        )
        return RunnableSequence(prompt_template | self.llm | StrOutputParser())

    def execution(self, prompt=None, context_summary=None):
        try:
            full_prompt = prompt
            if context_summary and any(word in prompt.lower() for word in ["these", "those", "them", "above", "mentioned"]):
                full_prompt = f"{prompt}\nContext Info (Previous Answer Summary):\n{context_summary}"

            res = self.sql_model(full_prompt)
            query_sql = [elem["sql_cmd"] for elem in res["intermediate_steps"] if "sql_cmd" in elem][0]
            query_sql = clean_sql_query(query_sql)
            query_df = pd.read_sql_query(sql.text(query_sql), self.conn)

            output = {"query_df": query_df, "query_sql": query_sql}

            if not query_df.empty:
                full_count = len(query_df)
                df_preview = query_df.head(50).to_markdown(index=False)  # Reduced for performance
                summary = self.summary_model.invoke({
                    "table": df_preview,
                    "question": prompt,  # Use original question to exclude context
                    "count": full_count,
                    "date": datetime.today().strftime("%d-%m-%Y")
                })
                output["result"] = summary
                output["context_summary"] = self.__generate_context_summary(query_df)

            return output

        except Exception as error:
            return {"error": str(error)}

    def __generate_context_summary(self, df: pd.DataFrame):
        if df.empty:
            return ""

        summary_parts = [f"Total records: {len(df)}"]
        id_col = "po_id" if "po_id" in df.columns else "purchase_order_id" if "purchase_order_id" in df.columns else None

        if id_col:
            for po_id in df[id_col].unique()[:50]:  # Limit to 50 POs for performance
                po_data = df[df[id_col] == po_id].iloc[0]
                po_summary = [f"For Purchase Order ID: {po_id}"]
                formatted_row = [
                    f"  {col.replace('_', ' ').title()}: "
                    f"{pd.Timestamp(po_data[col]).strftime('%Y-%m-%d') if pd.notnull(po_data[col]) else 'null'}"
                    if "date" in col.lower()
                    else f"  {col.replace('_', ' ').title()}: {f'{po_data[col]:,.2f}'.replace(',', ',') if pd.notnull(po_data[col]) else 'null'}"
                    if df[col].dtype in ["int64", "float64"]
                    else f"  {col.replace('_', ' ').title()}: {po_data[col] if pd.notnull(po_data[col]) else 'null'}"
                    for col in df.columns
                ]
                po_summary.extend(formatted_row)
                summary_parts.append("\n".join(po_summary))
        else:
            max_rows = 50  # Reduced for performance
            for idx, row in df.head(max_rows).iterrows():
                formatted_row = [
                    f"{col.replace('_', ' ').title()}: "
                    f"{pd.Timestamp(row[col]).strftime('%Y-%m-%d') if pd.notnull(row[col]) else 'null'}"
                    if "date" in col.lower()
                    else f"{col.replace('_', ' ').title()}: {f'{row[col]:,.2f}'.replace(',', ',') if pd.notnull(row[col]) else 'null'}"
                    if df[col].dtype in ["int64", "float64"]
                    else f"{col.replace('_', ' ').title()}: {row[col] if pd.notnull(row[col]) else 'null'}"
                    for col in df.columns
                ]
                summary_parts.append(f"Row {idx+1}: {', '.join(formatted_row)}")
            if len(df) > max_rows:
                summary_parts.append(f"... (showing first {max_rows} of {len(df)} rows)")

        return "\n".join(summary_parts)