import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import NotFound from "./pages/NotFound";
// import Home from "./pages/Home";
// import ProtectedRoute from "./components/ProtectedRoute";
import ListItems from "./components/ListItems";
import axios from "axios";
import { useState, useEffect } from "react";
import type { Item } from "./constants";

// function LogOut() {
//   localStorage.clear();
//   return <Navigate to="/login" />;
// }

// function RegisterAndLogout() {
//   localStorage.clear();
//   return <Register />;
// }

function App() {
  const [allItems, setAllItems] = useState<Item[] | null>(null);

  useEffect(() => {
    axios
      .get<Item[]>("http://127.0.0.1:8000/api/")
      .then((response) => setAllItems(response.data))
      .catch((err) => console.log(err));
  }, []);

  // only the first route will be used for now before all of the jwt tokens are finished
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<ListItems items={allItems} />} />
        {/* <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        ></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<LogOut />} />
        <Route path="/register" element={<Register />} />
        <Route path="/registerLogout" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
