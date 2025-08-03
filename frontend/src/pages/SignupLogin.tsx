import api from "../api";
import { useEffect } from "react";

function SignupLogin() {
  useEffect(() => {
    api
      .post("/token/login", {
        email: "test@test.com",
        password: "123",
      })
      .then((response) => {
        console.log(response.data);
        localStorage.setItem("access_token", response.data.access_token);
      });
  }, []);

  useEffect(() => {
    api.get("/token/me").then((response) => {
      console.log(response.data);
    });
  }, []);

  return <></>;
}

export default SignupLogin;
