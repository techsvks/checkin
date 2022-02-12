import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import config from "../api/config";
import { spreadsheetID } from "../api/spreadsheetID";
import Logo from "../images/Logo.png";
import { useDebounce } from "use-debounce";
import { useReactToPrint } from "react-to-print";
import { ToPrint } from "../components/ToPrint";

const { GoogleSpreadsheet } = require("google-spreadsheet");
const doc = new GoogleSpreadsheet(spreadsheetID);

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
function dateDiffInDays(a, b) {
    // https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.abs(Math.floor((utc2 - utc1) / _MS_PER_DAY));
}

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

function Print(props) {
    const [todaySheet, setTodaySheet] = useState({});
    const [todayRows, setTodayRows] = useState({});
    const [QRValue, setQRValue] = useState("");
    const [inputText, setInputText] = useState("");
    const [searchQuery] = useDebounce(inputText, 50);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);

    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    function findMostRecentSheetDate() {
        let sheetDate = new Date();
        let today = new Date();
        let sheetDateString = null;
        while (!sheetDateString) {
            for (let option of dateFormatOptions) {
                if (
                    doc.sheetsByTitle[
                        sheetDate.toLocaleDateString("en-US", option)
                    ]
                ) {
                    sheetDateString = sheetDate.toLocaleDateString(
                        "en-US",
                        option
                    );
                    break;
                }
            }
            sheetDate.setDate(sheetDate.getDate() - 1);
            if (dateDiffInDays(today, sheetDate) > 400) break;
        }
        return sheetDateString;
    }

    useEffect(function () {
        async function initializeWorker() {
            await doc.useServiceAccountAuth(config);
            await doc.loadInfo(); // loads document properties and worksheets

            // find today sheet

            let sheetDate = findMostRecentSheetDate();

            if (!doc.sheetsByTitle[sheetDate]) {
                toast.error(`❗ Could not find data to use.`, {
                    position: "bottom-center",
                    autoClose: 300000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            } else {
                let ts = doc.sheetsByTitle[sheetDate];
                setTodaySheet(ts);
                const rows = await ts.getRows();
                setTodayRows(rows);

                toast.success(`✅ Found ID data.`, {
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
    }, []);

    useEffect(
        async function () {
            if (searchQuery) {
                let sr = await findStudents(searchQuery);
                if (sr.length === 1) {
                    setQRValue(sr[0]);
                }
                if (sr.length > 0) setSearchResults(sr);
            } else {
                setQRValue({});
                setSearchResults([]);
            }
        },
        [searchQuery]
    );

    async function findStudents(text) {
        let results = [];

        for (const row of todayRows) {
            if (results.length > 4) break;
            if (
                (row["ID"] + "").includes(text) ||
                row["이름"]?.includes(text)
            ) {
                let resultString = `${row["이름"]}:  ${row["ID"]}`;
                let resultObject = {
                    text: resultString,
                    name: row["이름"],
                    id: row["ID"],
                };
                results.push(resultObject);
            }
        }
        return results;
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                backgroundColor: "white",
            }}
        >
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
                    Print QR Codes
                </h1>
            </div>
            <div
                style={{
                    marginTop: "4rem",
                    marginBottom: "4rem",
                    width: "max(calc(100vw - 30rem), 80%)",
                    fontSize: "1.5rem",
                }}
            >
                <input
                    placeholder={"Search for student or enter a number..."}
                    style={{
                        width: "100%",
                        fontSize: "1.5rem",
                        border: "2px solid lightgray",
                        borderRadius: "1rem",
                        outline: "none",
                        padding: "1rem",
                        boxSizing: "border-box",
                        textAlign: "center",
                    }}
                    value={inputText}
                    onChange={(event) => {
                        setInputText(event.target.value);
                    }}
                ></input>

                {searchResults.map((result) => {
                    return (
                        <div
                            onClick={function () {
                                // setQRValue(result.id);
                                // setInputText(result.name);
                                // function () {
                                setSelectedCodes([...selectedCodes, result]);
                                // console.log(QRValue);
                                // }
                            }}
                            style={{
                                width: "100%",
                                marginTop: "0.5rem",
                                border: "1px solid lightgray",
                                borderRadius: "1rem",
                                padding: "0.5rem",
                                boxSizing: "border-box",
                                userSelect: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <h4
                                style={{
                                    marginRight: "2rem",
                                    marginTop: 0,
                                    marginBottom: 0,
                                }}
                            >
                                {result.text}
                            </h4>
                            {QRValue.id && (
                                <QRCode size={50} value={QRValue.id} />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* {QRValue && QRValue.id && <QRCode value={QRValue.id} />}
            <button
                style={{
                    marginTop: "2rem",
                    marginBottom: "2rem",
                    border: "2px solid lightgray",
                    borderRadius: "1rem",
                    padding: "0.5rem",
                    width: "10rem",
                }}
                onClick={function () {
                    setSelectedCodes([...selectedCodes, QRValue]);
                    console.log(QRValue);
                }}
            >
                Select
            </button> */}

            {/* {QRValue && (
                <>
                </>
            )} */}

            {/* <h1 style={{ textAlign: "center", margin: 0 }}>{QRValue.text}</h1> */}
            {/* <h1 style={{ textAlign: "center", margin: 0 }}>To print: </h1> */}
            {selectedCodes.length > 0 && (
                <>
                    <div
                        style={{
                            width: "100%",
                            width: "max(calc(100vw - 30rem), 80%)",
                            boxSizing: "border-box",
                            padding: "1rem",
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fill, minmax(150px, 1fr))",
                            gap: "1rem",
                        }}
                    >
                        {selectedCodes.map((code) => (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                <QRCode size={100} value={code.id} />
                                <p
                                    style={{
                                        marginTop: "0.5rem",
                                        marginBottom: 0,
                                    }}
                                >
                                    {code.text}
                                </p>
                                <button
                                    style={{
                                        marginTop: "0.5rem",
                                        border: "2px solid lightgray",
                                        borderRadius: "1rem",
                                        padding: "0.5rem",
                                        boxSizing: "border-box",
                                        width: "3rem",
                                    }}
                                    onClick={function () {
                                        setSelectedCodes(
                                            selectedCodes.filter(
                                                (c) => c.id != code.id
                                            )
                                        );
                                    }}
                                >
                                    X
                                </button>
                            </div>
                        ))}
                    </div>
                    <ToPrint ref={printRef}>
                        <div
                            style={{
                                width: "100%",
                                // width: "max(calc(100vw - 30rem), 80%)",
                                boxSizing: "border-box",
                                // padding: "1rem",
                                // display: "grid",
                                // gridTemplateColumns:
                                //     "repeat(auto-fill, minmax(150px, 1fr))",
                                // gap: "3rem",
                                display: "block",
                            }}
                        >
                            {selectedCodes.map((code) => (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        // float: "left",
                                        display: "inline-block",
                                        boxSizing: "border-box",
                                        padding: "1rem",
                                    }}
                                >
                                    <QRCode
                                        style={{ margin: "2rem" }}
                                        size={160}
                                        value={code.id}
                                    />
                                    <p
                                        style={{
                                            marginTop: "0.5rem",
                                            marginBottom: 0,
                                            textAlign: "center",
                                        }}
                                    >
                                        {code.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </ToPrint>
                    <button
                        style={{
                            marginBottom: "1rem",
                            marginTop: "1rem",
                            border: "2px solid lightgray",
                            borderRadius: "1rem",
                            padding: "0.5rem",
                            boxSizing: "border-box",
                            width: "min(30rem, 80%)",
                        }}
                        onClick={handlePrint}
                    >
                        Print codes.
                    </button>
                </>
            )}
            {/* <h1
                style={{
                    textAlign: "center",
                    margin: 0,
                    color: "lightgray",
                    fontSize: "1rem",
                    marginTop: "1rem",
                    marginBottom: "1rem",
                }}
            >
                v 1.1
            </h1> */}
        </div>
    );
}

export default Print;
