import api from "../../api";
import { useEffect, useState } from "react";

function SignupLogin() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    api
      .post("/token/login", {
        email: "test@test.com",
        password: "123",
      })
      .then((response) => {
        console.log(response.data);
        localStorage.setItem("access_token", response.data.access_token);
        setLoggedIn(true);
      });
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    api
      .get("/token/me")
      .then((response) => {
        console.log(response.data);
      })
      .catch((err) => console.log(err));
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    api
      .get("/token/pref_tasks")
      .then((response) => {
        console.log(response.data);
      })
      .catch((err) => console.log(err));
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    api
      .get("/token/pref_items")
      .then((response) => {
        console.log(response.data);
      })
      .catch((err) => console.log(err));
  }, [loggedIn]);

  return <></>;
}

export default SignupLogin;
