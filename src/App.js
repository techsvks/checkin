import logo from "./logo.svg";
import "./App.css";
import Scan from "./pages/Scan";
import Print from "./pages/Print";
import { ToastContainer } from "react-toastify";
import { Zoom } from "react-toastify";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Scan />} />
                    <Route path="print" element={<Print />} />
                </Routes>

                <ToastContainer
                    position="bottom-center"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    pauseOnFocusLoss={false}
                    transition={Zoom}
                    icon={false}
                />
                <h2>
                    v 1.8
                </h2>
            </div>
        </Router>
    );
}

export default App;
