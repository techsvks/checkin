import React, { useEffect } from "react";
import "./App.css";
import Scan from "./pages/Scan";
import Print from "./pages/Print";
import { ToastContainer } from "react-toastify";
import { Zoom } from "react-toastify";
import { HashRouter as Router, Routes, Route, Link} from "react-router-dom";
import Doc from "./Doc";

const doc = new Doc();
function App() {
    useEffect(function () {
        async function initialize() {
            console.log("Initialize app");
            doc.openDoc();
        }
        initialize();
    }, []);

    return (
        <Router>
            <div>
                <nav id="nav">
                    <tr id="nav">
                        <td id="nav_item">
                            <Link to="/">Scan</Link>
                        </td>
                        <td id="nav_item">
                            <Link to="/print">Print</Link>
                        </td>
                    </tr>
                </nav>
            </div>

            <hr />

            <div className="App">
                <Routes>
                    <Route path="/" element={<Scan doc={doc} />} />
                    <Route path="print" element={<Print doc={doc}/>} />
                </Routes>

                <ToastContainer
                    position="bottom-center"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    draggable
                    pauseOnHover
                    pauseOnFocusLoss={false}
                    transition={Zoom}
                    icon={false}
                />
                <h2>
                    v 1.8.1
                </h2>
            </div>
        </Router>
    );
}

export default App;
