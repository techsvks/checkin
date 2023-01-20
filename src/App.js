import React, { useEffect } from "react";
import "./App.css";
import Scan from "./pages/Scan";
import Print from "./pages/Print";
import Manual from "./pages/Manual";
import { ToastContainer } from "react-toastify";
import { Zoom } from "react-toastify";
import { HashRouter as Router, Routes, Route, Link} from "react-router-dom";
import Doc from "./Doc";

const doc = new Doc();
function App() {
    useEffect(function () {
        async function initialize() {
            console.log("Initialize app");
            console.log(process.env.APP_NAME);
            console.log(process.env.APP_VERSION);
            doc.openDoc();
        }
        initialize();
    }, []);

    return (
        <Router>
            <div>
                <nav id="nav">
                    <table id="nav"><tbody>
                    <tr>
                        <td id="nav_item">
                            <Link to="/"><button id="nav_scan">Scan</button></Link>
                        </td>
                        <td id="nav_item">
                            <Link to="/manual"><button id="nav_manual">Manual</button></Link>
                        </td>
                        <td id="nav_item">
                            <Link to="/print"><button id="nav_print">Print</button></Link>
                        </td>
                    </tr>
                    </tbody></table>
                </nav>
            </div>

            <hr />

            <div className="App">
                <Routes>
                    <Route path="/" element={<Scan doc={doc} />} />
                    <Route path="/print" element={<Print doc={doc}/>} />
                    <Route path="/manual" element={<Manual doc={doc}/>} />
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
                    v {process.env.REACT_APP_VERSION}
                </h2>
            </div>
        </Router>
    );
}

export default App;
