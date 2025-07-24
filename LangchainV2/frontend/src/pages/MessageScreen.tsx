import { SendOutlined } from "@mui/icons-material";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { clearMessages, setMessages } from "../redux/chatbot";
import { api } from "../services/api";
import Loader from "../common/Loader";
import parseMarkdownToJSX from "../utils/parseMarkdownToJSX";
import avatar from "../assets/chatbot.png";
import user2 from "../assets/user2.webp";
import microphone from "../assets/microphone.png";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import microphoneListening from "../assets/microphoneListening.jfif";
import { ReplaceEmptyWithNA } from "../utils/ReplaceEmptyWithNa";
import { getCurrentTime } from "../utils/dateFormatter";
import { dataGridTable } from "../utils/dataGridTable";

const Messages = () => {
  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chatbot.messages);
  const [messageValue, setMessageValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (transcript) {
      setMessageValue(transcript);
    }
  }, [transcript]);

  const handleMessageValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageValue(e.target.value);
  };

  useEffect(() => {
    const clearHistoryOnMount = async () => {
      try {
        const url = "/clear-history";
        await api.post(url, {}, {
          withCredentials: true,
        });
        dispatch(clearMessages());
      } catch (err) {
        console.error("Failed to clear history on mount:", err);
      }
    };

    clearHistoryOnMount();
  }, []);

  const handleSearch = async (
    message: string = messageValue,
    fromNewMessage: boolean = false
  ) => {
    if (message.trim().length === 0) return;
    const sentMessage = message.trim();
    if (!fromNewMessage) {
      dispatch(
        setMessages({
          text: sentMessage,
          isUser: true,
          timestamp: getCurrentTime(),
        })
      );
    }
    setMessageValue("");
    setLoading(true);
    const payload = { question: sentMessage };
    const url = `/query/`;

    try {
      const response = await api.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
      const botMessage = response.data.result;
      const ambiguousData = ReplaceEmptyWithNA(response.data.data) || [];
      const formattedBotMessage = parseMarkdownToJSX(botMessage);
      dispatch(
        setMessages({
          text: formattedBotMessage,
          isUser: false,
          timestamp: getCurrentTime(),
          ambiguous_data: ambiguousData,
        })
      );
    } catch (err) {
      console.error("Error sending message:", err);
      dispatch(
        setMessages({
          text: "Error: Could not send message",
          isUser: false,
          timestamp: getCurrentTime(),
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && messageValue.trim().length > 0) {
      handleSearch();
    }
  };

  const handleMicrophoneClick = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript.trim().length > 0) {
        handleSearch(transcript);
        resetTranscript();
      }
    } else {
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  return (
    <Stack direction="column" height="100vh" position={"relative"}>
      <Box className="top-headers" boxShadow={1}>
        <Typography
          textAlign={"center"}
          fontWeight="600"
          fontFamily="Poppins"
          sx={{ cursor: "default" }}
        >
          Query Agent
        </Typography>
      </Box>
      <Box
        mb={5.5}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "54px 12px 8px",
          display: "flex",
          flexDirection: "column-reverse",
          gap: "7px",
          justifyContent:
            messages.length === 0 && !loading ? "flex-end" : "flex-start",
        }}
      >
        <div ref={messagesEndRef} />
        {loading && (
          <Box
            display={"flex"}
            justifyContent={"flex-start"}
            alignSelf={"flex-start"}
          >
            <Box
              sx={{
                ml: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Loader />
            </Box>
          </Box>
        )}
        {messages.length === 0 && !loading ? (
          <Typography
            color="#757575"
            fontFamily="Poppins"
            fontSize={18}
            textAlign="center"
            mt={20}
          >
            Welcome to Query Agent
          </Typography>
        ) : (
          <>
            {messages
              .slice()
              .reverse()
              .map((msg, index) => (
                <Box
                  key={messages.length - 1 - index}
                  sx={{
                    display: "flex",
                    justifyContent: msg.isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    alignSelf: msg.isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <Box display={"flex"} flexDirection={"column"} gap={0.5}>
                    <Typography
                      fontFamily="Poppins"
                      fontSize={10}
                      fontWeight={600}
                      ml={4}
                      mr={4}
                      color="#757575"
                      textAlign={msg.isUser ? "right" : "left"}
                    >
                      {msg.isUser ? "You" : "Query Agent"}
                    </Typography>
                    <Box
                      display={"flex"}
                      flexDirection={msg.isUser ? "row-reverse" : "row"}
                      alignItems={"flex-start"}
                      gap={1}
                    >
                      <img
                        src={msg.isUser ? user2 : avatar}
                        alt={msg.isUser ? "User Avatar" : "Bot Avatar"}
                        className="avatar-image"
                      />
                      <Box
                        mt={0.5}
                        className={!msg.isUser ? "message-card" : ""}
                        sx={{ maxWidth: !msg.isUser ? "700px" : "100%" }}
                      >
                        <Typography
                          className={msg.isUser ? "user-message-card" : ""}
                          sx={{
                            backgroundColor: msg.isUser ? "#f5f5f5" : "#fff",
                          }}
                          fontFamily="Poppins"
                          fontSize={11}
                        >
                          {msg.text ?? ""}
                        </Typography>
                        {!msg.isUser &&
                          msg.ambiguous_data &&
                          msg.ambiguous_data.length > 0 &&
                          dataGridTable(msg.ambiguous_data)}
                      </Box>
                    </Box>

                    <Typography
                      fontFamily="Poppins"
                      fontSize={8}
                      ml={4}
                      mr={4}
                      color="#757575"
                      textAlign={msg.isUser ? "right" : "left"}
                    >
                      {`Today ${msg.timestamp}`}
                    </Typography>
                  </Box>
                </Box>
              ))}
          </>
        )}
      </Box>

      <Box
        className="message-bottom"
        display="flex"
        alignItems="center"
        gap={1}
      >
        <TextField
          className="message-fields"
          fullWidth
          placeholder="Ask Anything..."
          value={messageValue}
          onChange={handleMessageValue}
          onKeyDown={handleKeyDown}
        />
        <IconButton
          className="microphone-icon-button"
          size="small"
          onClick={handleMicrophoneClick}
          aria-label="voice input"
          disabled={
            loading || !SpeechRecognition.browserSupportsSpeechRecognition()
          }
        >
          <img
            src={listening ? microphoneListening : microphone}
            alt="Microphone"
            style={{ height: "25px", width: "25px" }}
          />
        </IconButton>
        <IconButton
          className="arrow-icon-button"
          size="small"
          onClick={() => handleSearch()}
          aria-label="send message"
          disabled={loading}
        >
          <SendOutlined sx={{ height: "25px", width: "25px" }} />
        </IconButton>
      </Box>
    </Stack>
  );
};

export default Messages;
