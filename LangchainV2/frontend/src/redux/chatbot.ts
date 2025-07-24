import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { JSX } from "react";

interface Message {
  text: string | JSX.Element;
  isUser: boolean;
  timestamp: string;
  ambiguous_data?: string[];
}

type ChatbotState = {
  tenantId: string;
  messages: Message[];
  tokenId: string;
};

const initialState: ChatbotState = {
  tenantId: "",
  messages: [],
  tokenId: "",
};

const chatbotSlice = createSlice({
  name: "chatbot",
  initialState,
  reducers: {
    setTenantId: (state, action: PayloadAction<string>) => {
      state.tenantId = action.payload;
    },
    setMessages: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setTokenId: (state, action: PayloadAction<string>) => {
      state.tokenId = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { setTenantId, setMessages, clearMessages, setTokenId } = chatbotSlice.actions;
export default chatbotSlice.reducer;
