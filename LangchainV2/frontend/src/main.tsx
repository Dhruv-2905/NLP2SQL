import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./global.scss";
import { store } from "./redux/store";
import { Provider } from "react-redux";
import { AuthProvider } from "./context/AuthContext";

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
root.render(
  <BrowserRouter basename="/smartagent">
    <Provider store={store} >
      {/* <AuthProvider> */}
        <App />
      {/* </AuthProvider> */}
    </Provider>
  </BrowserRouter>
);
