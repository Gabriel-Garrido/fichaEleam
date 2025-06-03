import { useState } from "react";
import "./App.css";
import "./colors.css";
import Navbar from "./components/Navbar";
import Jumbotron from "./components/Jumbotron";

function App() {
  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="">
        <Jumbotron />
      </div>
    </div>
  );
}

export default App;
