import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import NotFound from "./pages/NotFound";
// import Home from "./pages/Home";
// import ProtectedRoute from "./components/ProtectedRoute";
import DisplayItems from "./pages/DisplayItems";
import DisplayTasks from "./pages/DisplayTasks";
import SignupLogin from "./pages/SignupLogin";
import TaskView from "./pages/TaskView";
import ItemView from "./pages/ItemView";

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
        <Route path="*" element={<DisplayItems />} />
        <Route path="/tasks" element={<DisplayTasks />} />
        <Route path="/task_view" element={<TaskView />} />
        <Route path="/item_view" element={<ItemView />} />
        <Route path="/signup" element={<SignupLogin />} />
        {/* <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        ></Route>
        <Route path="/login" element={<Login />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
