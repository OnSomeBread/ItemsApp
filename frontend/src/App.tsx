import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";
// import SignupLogin from "./pages/SignupLogin";
// import PageSwitch from "./components/PageSwitch";

const DisplayItems = lazy(() => import("./pages/DisplayItems"));
const DisplayTasks = lazy(() => import("./pages/DisplayTasks"));
const TaskView = lazy(() => import("./pages/TaskView"));
const ItemView = lazy(() => import("./pages/ItemView"));
const TaskTree = lazy(() => import("./pages/TaskTree"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="*" element={<DisplayItems />} />
          <Route path="/items" element={<DisplayItems />} />
          <Route path="/tasks" element={<DisplayTasks />} />
          <Route path="/task_view" element={<TaskView />} />
          <Route path="/item_view" element={<ItemView />} />
          <Route path="/task_tree" element={<TaskTree />} />
          {/* <Route path="/signup" element={<SignupLogin />} /> */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
