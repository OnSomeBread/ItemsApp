import { BrowserRouter, Routes, Route } from "react-router-dom";
import DisplayItems from "./pages/DisplayItems";
import DisplayTasks from "./pages/DisplayTasks";
import SignupLogin from "./pages/SignupLogin";
import TaskView from "./pages/TaskView";
import ItemView from "./pages/ItemView";
import TaskTree from "./pages/TaskTree";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<DisplayItems />} />
        <Route path="/tasks" element={<DisplayTasks />} />
        <Route path="/task_view" element={<TaskView />} />
        <Route path="/item_view" element={<ItemView />} />
        <Route path="/signup" element={<SignupLogin />} />
        <Route path="/task_tree" element={<TaskTree />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
