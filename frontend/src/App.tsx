import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import NotFound from "./pages/NotFound";
// import Home from "./pages/Home";
// import ProtectedRoute from "./components/ProtectedRoute";
import DisplayItems from "./pages/DisplayItems";
import DisplayCart from "./pages/DisplayCart";

// function LogOut() {
//   localStorage.clear();
//   return <Navigate to="/login" />;
// }

// function RegisterAndLogout() {
//   localStorage.clear();
//   return <Register />;
// }

function App() {
  // only the first route will be used for now before all of the jwt tokens are finished
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cart" element={<DisplayCart />} />
        <Route path="*" element={<DisplayItems />} />
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
