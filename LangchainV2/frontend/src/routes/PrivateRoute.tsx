import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";
import NotAuthenticated from "../common/NotAuthenticated";
import Loader from "../common/Loader";

type PrivateRouteProps = {
  children: ReactNode;
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader />;
  if (!isAuthenticated) return <NotAuthenticated />;

  return children;
};

export default PrivateRoute;
