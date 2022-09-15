import React, { useEffect, useState } from "react";
import QrReader from "react-qr-scanner";
import config from "../api/config";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Logo from "../images/Logo.png";
import Reader from "../components/Reader";
import { spreadsheetID } from "../api/spreadsheetID";

const { GoogleSpreadsheet } = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(spreadsheetID);
const dateFormatOptions = [
    { year: "numeric", month: "numeric", day: "numeric" },
    { year: "2-digit", month: "numeric", day: "numeric" },
    { year: "numeric", month: "2-digit", day: "numeric" },
    { year: "2-digit", month: "2-digit", day: "numeric" },
    { year: "numeric", month: "numeric", day: "2-digit" },
    { year: "2-digit", month: "numeric", day: "2-digit" },
    { year: "numeric", month: "2-digit", day: "2-digit" },
    { year: "2-digit", month: "2-digit", day: "2-digit" },
];

function Scan(props) {
    const [todaySheet, setTodaySheet] = useState({});
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());

    const [isWorking, setIsWorking] = useState(false);

    useEffect(function () {
        async function initializeWorker() {
            await doc.useServiceAccountAuth(config);
            await doc.loadInfo(); // loads document properties and worksheets

            let tD = new Date();

            for (let option of dateFormatOptions) {
                // console.log(tD.toLocaleDateString("en-US", option));
                if (doc.sheetsByTitle[tD.toLocaleDateString("en-US", option)]) {
                    tD = tD.toLocaleDateString("en-US", option);
                    const tS = doc.sheetsByTitle[tD];
                    console.log("tS");
                    console.log(tS);
                    setTodaySheet(tS);
                    setTodayDate(tD);

                    console.log("toasting sccess");
                    toast.success(`✅ Ready to check in!`, {
                        position: "bottom-center",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                    });
                    return;
                }
            }

            toast.warning(
                `Please create the spreadsheet for today and reload the app to check in!`,
                {
                    position: "bottom-center",
                    autoClose: 300000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                }
            );
            toast.error(`❗ Could not find spreadsheet with today's date!`, {
                position: "bottom-center",
                autoClose: 300000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
        initializeWorker();
    }, []);

    async function findStudentRow(ID) {
        if (Object.keys(todaySheet).length === 0) return null;
        console.log("finding student row");
        const rows = await todaySheet.getRows();
        console.log("rows");
        console.log(rows);
        console.log("ID");
        console.log(ID);

        for (const row of rows) {
            if (row["ID"] == ID) {
                console.log(row["ID"]);
                return row.rowNumber;
            }
        }
        return null;
    }

    function getCurrentTime() {
        return new Date().toLocaleTimeString("en-US", {
            hour12: true,
            hour: "numeric",
            minute: "numeric",
        });
    }

    async function handleScan(data) {
        console.log("reached function");
        console.log("data");
        console.log(data);
        if (data) {
            console.log("handling scanning");
            if (isWorking) return; // Check if still checking in someone

            setIsWorking(true);

            // Locate student in the spreadsheet today
            let studentNumber = data;
            let studentRowNumber = await findStudentRow(studentNumber);
            const currentTime = getCurrentTime();

            if (studentRowNumber === null) {
                // Student does not exist
                toast.error(`❗ Student ID could not be found!`, {
                    position: "bottom-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            } else {
                // Student ID is found
                let todaySheetRows = await todaySheet.getRows();
                let workingRow = todaySheetRows[parseInt(studentRowNumber) - 2];

                // Determine action to take
                if (!workingRow["Check in"]) {
                    // Check student in
                    workingRow["Check in"] = currentTime;
                    await workingRow.save();

                    toast.success(
                        `👋 Checked in ${workingRow["이름"]} at ${currentTime}!`,
                        {
                            position: "bottom-center",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                        }
                    );
                } else if (!workingRow["Check out"]) {
                    // Check student out
                    workingRow["Check out"] = currentTime;
                    await workingRow.save();

                    toast.success(
                        `🚪 Checked out ${workingRow["이름"]} at ${currentTime}!`,
                        {
                            position: "bottom-center",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                        }
                    );
                } else {
                    // Student check in and out are both filled
                    toast.warn(
                        `🟡 ${workingRow["이름"]} is already accounted for!`,
                        {
                            position: "bottom-center",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                        }
                    );
                }
            }
            setIsWorking(false);
        }
    }

    function handleError(err) {
        console.error(err);
    }

    const previewStyle = {
        height: "100%",
        width: "auto",
    };

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "row",
                    marginTop: "1rem",
                    marginBottom: "1rem",
                }}
            >
                <img
                    style={{ height: "3rem", marginRight: "1rem" }}
                    src={Logo}
                ></img>
                <h1 style={{ textAlign: "center", margin: 0 }}>
                    SVKS Check In/Out
                </h1>
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    overflow: "hidden",
                    height: "calc(100vh - 10rem)",
                }}
            >
                {/* <QrReader
                    delay={100}
                    style={previewStyle}
                    onError={handleError}
                    onScan={handleScan}
                    facingMode={"rear"}
                /> */}

                <Reader
                    onScan={handleScan}
                    myFunc={function () {
                        console.log("helo");
                    }}
                ></Reader>
            </div>
            {/* <h1
                style={{
                    textAlign: "center",
                    margin: 0,
                    color: "lightgray",
                    fontSize: "1rem",
                    marginTop: "1rem",
                }}
            >
                v 1.1
            </h1> */}
        </div>
    );
}

export default Scan;
