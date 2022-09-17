import React, { useEffect, useRef, useState } from "react";
import "./Scan.css"
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import config from "../api/config";
import { spreadsheetID } from "../api/spreadsheetID";
import Logo from "../images/Logo.png";
import { useDebounce } from "use-debounce";
import { useReactToPrint } from "react-to-print";
import { ToPrint } from "../components/ToPrint";
import text from "../api/text";

const { GoogleSpreadsheet } = require("google-spreadsheet");
const doc = new GoogleSpreadsheet(spreadsheetID);


const toastProp = {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
};

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

const selectedIds = new Set();

function Print(props) {
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
        async function initialize() {
            await doc.useServiceAccountAuth(config);
            await doc.loadInfo(); // loads document properties and worksheets

            // find today sheet
            let sheetDate = findMostRecentSheetDate();

            if (!doc.sheetsByTitle[sheetDate]) {
                toast.error(text.failedToOpen, toastProp);
            } else {
                let ts = doc.sheetsByTitle[sheetDate];
                const rows = await ts.getRows();
                setTodayRows(rows);

                toast.success(text.succeededToOpen, toastProp);
                console.log("Sheet read " + rows.length);
            }
        }
        initialize();
    }, []);

    useEffect(
        () => {
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
            async function query() {
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
            }
            query();
        },
        [searchQuery, todayRows]
    );


    async function addMarkedStudents() {
        let results = [];

        for (const row of todayRows) {
            if (row["Print"]?.toLowerCase() === "x" && !selectedIds.has(row["ID"])) {
                let resultString = `${row["이름"]}:  ${row["ID"]}`;
                let resultObject = {
                    text: resultString,
                    name: row["이름"],
                    id: row["ID"],
                };
                results.push(resultObject);
                selectedIds.add(row["ID"]);
            }
        }
        setSelectedCodes([...selectedCodes, ...results]);
    }

    return (
        <div id="print">
            <div id="title">
                <img id="logo"
                    src={Logo}
                    alt="logo"
                ></img>
                <h1>
                    Print QR Codes
                </h1>
            </div>
            <div id="printContents" >
                <input id="search"
                    placeholder={"Search for student or enter a number..."}
                    value={inputText}
                    onChange={(event) => {
                        setInputText(event.target.value);
                    }}
                ></input>

                {searchResults.map((result) => {
                    return (
                        <div key={result.id} id="searchResult"
                            onClick={function () {
                                // setQRValue(result.id);
                                // setInputText(result.name);
                                // function () {

                                if (!selectedIds.has(result.id)) {
                                setSelectedCodes([...selectedCodes, result]);
                                selectedIds.add(result.id);
            }
                                // console.log(QRValue);
                                // }
                            }}
                        >
                            <h4>
                                {result.text}
                            </h4>
                            {QRValue.id && (
                                <QRCode size={50} value={QRValue.id} />
                            )}
                        </div>
                    );
                })}
            </div>
            {selectedCodes.length > 0 && (
                <>
                    <div id="selected">
                        {selectedCodes.map((code) => (
                            <div key={code.id} id="selectedItem">
                                <QRCode size={100} value={code.id} />
                                <p id="qrName"> {code.text} </p>
                                <button id="deleteButton"
                                    onClick={function () {
                                        setSelectedCodes(
                                            selectedCodes.filter(
                                                (c) => parseInt(c.id) !== parseInt(code.id)
                                            )
                                        );
                                        selectedIds.delete(code.id);
                                    }}
                                > X </button>
                            </div>
                        ))}
                    </div>
                    <ToPrint ref={printRef}>
                        <div id="qrList">
                            {selectedCodes.map((code) => (
                                <div key={code.id} id="qrCode" >
                                    <QRCode size={160} value={code.id} />
                                    <p id="qrName" >
                                        {code.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </ToPrint>
                    <button id="printButton" onClick={handlePrint}>
                        Print codes.
                    </button>
                </>
            )}
            <button id="printButton" onClick={addMarkedStudents}>
                Print codes for marked students.
            </button>
        </div>
    );
}

export default Print;
