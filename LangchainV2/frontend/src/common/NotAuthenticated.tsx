import { Box, Typography } from "@mui/material";
import Secure from "../assets/secureAuth.svg";

const NotAuthenticated = () => {
  return (
    <Box sx={{ height: "90vh" }}>
      <Box display={"flex"} alignItems={"center"} justifyContent={"center"}>
        <Secure />
      </Box>
      <Typography textAlign={"center"} fontWeight={500} fontSize={"25px"}>
        Not Authenticated
      </Typography>
    </Box>
  );
};

export default NotAuthenticated;
