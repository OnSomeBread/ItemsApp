import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";
import api from "../api";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

function ProtectedRoute({ children }: Props) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const refreshToken = async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      const response = await api.post("/api/token/refresh", {
        refresh: refresh,
      });
      if (response.status === 200) {
        localStorage.setItem("access_token", response.data.access_token);
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.log(error);
      setIsAuthorized(false);
    }
  };

  const auth = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsAuthorized(false);
      return;
    }
    const decoded = jwtDecode(token);

    // has the token expired
    if (decoded.exp === undefined || decoded.exp < Date.now() / 1000) {
      await refreshToken();
    } else {
      setIsAuthorized(true);
    }
  };

  useEffect(() => {
    auth().catch(() => setIsAuthorized(false));
  });

  if (isAuthorized === null) {
    return <div>Loading...</div>;
  }
  return isAuthorized ? children : <p>need to login first</p>;
}

export default ProtectedRoute;
