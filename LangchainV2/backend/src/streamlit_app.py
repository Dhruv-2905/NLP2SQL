import streamlit as st
from utilities.config import *
from generative_ai import SQLNaturaLanguage
import pandas as pd
import sqlalchemy as sql
import time
import os
from dotenv import load_dotenv

load_dotenv()

class App_queries_naturallanguage():
    def __init__(self, temperature=0, model="gemini-2.5-flash"):
        db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
        self.sql_engine = sql.create_engine(db_url)
        self.conn = self.sql_engine.connect()
        self.API_KEY = os.getenv("GOOGLE_API_KEY")
        self.temperature = temperature
        self.model = model

    def _call_llm_sql(self, question=None, number_rows=200):
        sql_model = SQLNaturaLanguage(
            temperature=self.temperature,
            model=self.model
        )
        prompt = PROMPT.format(question=question, number_rows=number_rows)
        context = "\n\n".join(st.session_state.get("context_summaries", []))
        return sql_model.execution(prompt=prompt, context_summary=context)

    def execute(self):
        st.set_page_config(layout="wide", page_icon="🤖")

        # Fixed header using HTML and CSS
        st.markdown("""
            <style>
                .fixed-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    background-color: #f0f2f6;
                    padding: 1rem 2rem;
                    z-index: 999;
                    border-bottom: 1px solid #ccc;
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #333;
                }
                .stApp {
                    padding-top: 80px;
                }
            </style>
            <div class="fixed-header">💬 Smart Agent</div>
        """, unsafe_allow_html=True)

        self.__init_session()
        number_rows = 200  # Hardcoded number of results

        user_input = st.text_input("Ask your procurement question:", value="Top 5 most expensive orders", key="user_query", label_visibility="visible")

        if st.button("ASK", use_container_width=True):
            output = self._call_llm_sql(question=user_input, number_rows=number_rows)
            st.session_state.past.append(user_input)
            st.session_state.generated.append(output)

            if "context_summary" in output:
                st.session_state["context_summaries"].append(output["context_summary"])
                st.session_state["context_summaries"] = st.session_state["context_summaries"][-4:]

        # Show all past questions and responses (latest first)
        if st.session_state["generated"]:
            for i in reversed(range(len(st.session_state["generated"]))):
                self.__queryseparator(i)
                chat_message = st.session_state["generated"][i]
                if "error" in chat_message:
                    self.__error_show(chat_message)
                else:
                    # Animate only the most recent message (now on top)
                    self.__show_result(chat_message, animate=(i == len(st.session_state["generated"]) - 1))

    def __queryseparator(self, i):
        st.markdown(f"<hr/><h5>🧾 Query {i+1}</h5><p><b>User:</b> {st.session_state['past'][i]}</p>", unsafe_allow_html=True)

    def __error_show(self, chat_message):
        st.markdown("**Error occurred:**")
        st.code(chat_message["error"], language="python")

    def __show_result(self, chat_message, animate=False):
        if "result" in chat_message:
            if animate:
                self.__typing_text(chat_message["result"])
            else:
                st.markdown(f"<strong>{chat_message['result']}</strong>", unsafe_allow_html=True)

        if "query_df" in chat_message:
            st.dataframe(chat_message["query_df"])

        # if "query_sql" in chat_message:
        #     st.code(chat_message["query_sql"], language="sql")

    def __typing_text(self, text, delay=0.02):
        placeholder = st.empty()
        displayed = ""
        for char in text:
            displayed += char
            placeholder.markdown(f"<strong>{displayed}</strong>", unsafe_allow_html=True)
            time.sleep(delay)

    def __init_session(self):
        if "generated" not in st.session_state:
            st.session_state["generated"] = []
        if "past" not in st.session_state:
            st.session_state["past"] = []
        if "context_summaries" not in st.session_state:
            st.session_state["context_summaries"] = []

if __name__ == "__main__":
    app_class = App_queries_naturallanguage()
    app_class.execute()
