import { BrowserRouter, Routes, Route } from "react-router-dom";
import DisplayItems from "./pages/DisplayItems";
import DisplayTasks from "./pages/DisplayTasks";
import TaskView from "./pages/TaskView";
import ItemView from "./pages/ItemView";
import TaskTree from "./pages/TaskTree";
import "./App.css";
// import SignupLogin from "./pages/SignupLogin";
// import PageSwitch from "./components/PageSwitch";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<DisplayItems />} />
        <Route path="/items" element={<DisplayItems />} />
        <Route path="/tasks" element={<DisplayTasks />} />
        <Route path="/task_view" element={<TaskView />} />
        <Route path="/item_view" element={<ItemView />} />
        <Route path="/task_tree" element={<TaskTree />} />
        {/* <Route path="/signup" element={<SignupLogin />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
