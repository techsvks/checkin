import logo from "./logo.svg";
import "./App.css";
import Scan from "./pages/Scan";
import { ToastContainer } from "react-toastify";
import { Zoom } from "react-toastify";

function App() {
    return (
        <div className="App">
            <Scan></Scan>

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
        </div>
    );
}

export default App;
