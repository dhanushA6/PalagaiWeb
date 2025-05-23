import React from 'react';
import { Routes, Route , HashRouter as Router} from 'react-router-dom';
import HomePage from './pages/HomePage';
import ShapesList from './components/ShapesList';
import './App.css';
import ReactDOM from "react-dom/client";

function App() {
  return (
   
    <Router
      basename={process.env.PUBLIC_URL}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<ShapesList />} />
      </Routes>
  </Router>
  );
}

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

export default App;
