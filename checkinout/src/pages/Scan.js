import React, { useEffect, useState } from "react";
import QrReader from "react-qr-scanner";
import config from "../api/config";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Logo from "../images/Logo.png";

const { GoogleSpreadsheet } = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(
    "1sj8Hk1nN-pushHCR-pKLoNJWHQMIOnL1SBTueItOLvQ"
);

function Scan(props) {
    const [todaySheet, setTodaySheet] = useState({});
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());

    const [isWorking, setIsWorking] = useState(false);

    useEffect(
        function () {
            async function initializeWorker() {
                await doc.useServiceAccountAuth(config);
                await doc.loadInfo(); // loads document properties and worksheets

                if (!doc.sheetsByTitle[todayDate]) {
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
                    toast.error(
                        `❗ Could not find spreadsheet with today's date!`,
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
                } else {
                    const tS = doc.sheetsByTitle[todayDate];
                    setTodaySheet(tS);

                    toast.success(`✅ Ready to check in!`, {
                        position: "bottom-center",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                    });
                }
            }
            initializeWorker();
        },
        [todayDate]
    );

    async function findStudentRow(ID) {
        const rows = await todaySheet.getRows();
        for (const row of rows) {
            if (row["ID"] == ID) {
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
        if (data && data.text) {
            if (isWorking) return; // Check if still checking in someone

            setIsWorking(true);

            // Locate student in the spreadsheet today
            let studentNumber = data.text;
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
                <QrReader
                    delay={100}
                    style={previewStyle}
                    onError={handleError}
                    onScan={handleScan}
                />
            </div>
        </div>
    );
}

export default Scan;
