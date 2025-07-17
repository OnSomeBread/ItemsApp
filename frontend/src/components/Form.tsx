// import { useState } from "react";
// import api from "../api";
// import { useNavigate } from "react-router-dom";
// import type { FormEvent } from "react";

// interface Props {
//   route: any;
//   method: string;
// }

// function Form({ route, method }: Props) {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();

//   const name = method === "login" ? "Login" : "Register";

//   const onFormSubmit = (e: FormEvent) => {
//     setLoading(true);
//     e.preventDefault();
//     try {
//       const response = await api.post(route, { username, password });
//     } catch (error) {
//       alert(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={onFormSubmit} className="form-container">
//       <h1>{name}</h1>
//       <input
//         className="form-input"
//         type="text"
//         value={username}
//         onChange={(e) => setUsername(e.target.value)}
//         placeholder="Username"
//       />

//       <input
//         className="form-input"
//         type="password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         placeholder="Password"
//       />
//       <button className="form-button" type="submit">
//         {name}
//       </button>
//     </form>
//   );
// }
