import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from "react";
import secureLocalStorage from "react-secure-storage";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { decryptToken } from "../utils/tokenDecrypt";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import Cookies from "js-cookie";
import { setTokenId } from "../redux/chatbot";
import { idle_timeout, jwt_secret, vapt_token_url } from "../environment";

type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const IDLE_TIMEOUT = Number(idle_timeout) * 60 * 1000;
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const urlSearchParams = new URLSearchParams(window.location.search);
  const appType: string | null = urlSearchParams.get("app");

  const fetchToken = async () => {
    try {
      const response = await axios.get(
        `${vapt_token_url}${
          appType === "portal" ? "/portal" : "/upeg"
        }/extractToken`,
        {
          withCredentials: true,
        }
      );
      return response?.data || null;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  };

  const setAuthToken = async () => {
    setLoading(true);
    try {
      let upegToken: string | null;
      if (import.meta.env.VITE_MODE === "development") {
        upegToken = import.meta.env.VITE_TOKEN || "";
      } else {
        upegToken = await fetchToken();
      }

      if (upegToken) {
        const decryptedToken: string | null = decryptToken(
          decodeURIComponent(upegToken.replace(/\s/g, "+")),
          jwt_secret
        );
        if (!decryptedToken) {
          throw new Error("Failed to decrypt token");
        }
        console.log("token", upegToken);

        secureLocalStorage.setItem("token", upegToken);
        const decodedToken = jwtDecode<{
          appType: string;
        }>(decryptedToken);
        console.log(
          " app Type: ",
          decodedToken.appType
        );
        setToken(upegToken);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error setting token:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAuthToken();
  }, []);

  const logout = useCallback(() => {
    Cookies.remove("token");
    secureLocalStorage.removeItem("token");
    dispatch(setTokenId(""));
    setToken(null);
    setIsAuthenticated(false);
    navigate("/");
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logout();
      navigate("/");
    }, IDLE_TIMEOUT);
  }, [logout, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousemove", "keydown", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthenticated, resetTimer]);

  const contextValue = useMemo(
    () => ({
      token,
      isAuthenticated,
      loading,
      logout,
    }),
    [token, isAuthenticated, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
