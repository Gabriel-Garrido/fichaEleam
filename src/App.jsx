import { useState } from "react";
import "./App.css";
import "./colors.css";
import Navbar from "./components/Navbar";
import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <div className="bg-white min-h-screen">
      <AppRouter />
    </div>
  );
}

export default App;
