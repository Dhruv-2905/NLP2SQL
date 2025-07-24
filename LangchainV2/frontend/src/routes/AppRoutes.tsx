import { Route, Routes } from "react-router";
import PrivateRoute from "./PrivateRoute";
import MessageScreen from "../pages/MessageScreen";

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          // <PrivateRoute>
            <MessageScreen />
          // </PrivateRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
