// store.ts
import { configureStore } from '@reduxjs/toolkit';
import chatbotSlice from './chatbot';

export const store = configureStore({
  reducer: {
    chatbot: chatbotSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
