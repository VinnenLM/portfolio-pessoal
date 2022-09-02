import React from "react";
import Home from "./page/Home";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Pagina404 from "./page/Pagina404";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route path="*" element={<Pagina404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
