import logo from "./logo.svg";
import "./App.css";
import Scan from "./pages/Scan";
import { ToastContainer } from "react-toastify";
import { Zoom } from "react-toastify";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import Print from "./pages/Print";

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

                <h1
                    style={{
                        textAlign: "center",
                        margin: 0,
                        color: "lightgray",
                        fontSize: "1rem",
                        marginTop: "1rem",
                        marginBottom: "1rem",
                    }}
                >
                    v 1.4
                </h1>
            </div>
        </Router>
    );
}

export default App;
