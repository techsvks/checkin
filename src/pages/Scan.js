import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reader from "../components/Reader";

import "./Scan.css";
import Logo from "../images/Logo.png";
import config from "../api/config";
import header from "../api/header";
//import { spreadsheetID } from "../api/spreadsheetID";
const { GoogleSpreadsheet } = require("google-spreadsheet");

const spreadsheetID = '12AWolV6lI99LM6NNP1bUwYanAuNDSWRJI8X4-ozM98Q';
const doc = new GoogleSpreadsheet(spreadsheetID);

const MAX_COLUMN = 26;
const ASCII_A = 65;
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
const SCAN_INTERVAL = 1000;
const CHECK_INTERVAL = 5000;
const scanList = [];
const scanHistory = [];
const recentList = [];
let idList = [];
let columnIndex = {};
let todaySheet;
let recentCount = 0;

function addToRecentList(value) {
    recentList.push([recentCount, ...value]);
    if (recentList.length > 5)
    {
        console.log("copy from " + recentList.length + " - 5");
        recentList.shift();
    }
    recentCount += 1;
    console.log(recentList);
    console.log(recentList.length);
}

function createHeader(tS)
{
    let idIdx = null;
    let nameIdx = null;
    let classIdx = null;
    let checkInIdx = null;
    let checkOutIdx = null;
    for (let i = 0 ; i < MAX_COLUMN ; i++)
    {
        const entry = tS.getCell(0, i);
        if (entry.valueType == null)
        {
            continue;
        }
        nameIdx = (findHeader(entry.value, header.name)) ? i : nameIdx;
        idIdx = (findHeader(entry.value, header.id)) ? i : idIdx;
        classIdx = (findHeader(entry.value, header.class)) ? i : classIdx;
        checkInIdx = (findHeader(entry.value, header.checkIn)) ? i : checkInIdx;
        checkOutIdx = (findHeader(entry.value, header.checkOut)) ? i : checkOutIdx;
    }
    return {id:idIdx, name:nameIdx, class:classIdx, checkIn:checkInIdx, checkOut:checkOutIdx};
}


async function createIds(idIdx, tS)
{
    let rowIdx = 0;
    const ROW_RANGE = 50;
    let ids = [];
    let lastIdx = null;
    while (true)
    {
        // Read ROW_RANGE cell
        const query = String.fromCharCode(ASCII_A+idIdx) + (rowIdx+1) + ":" +
                      String.fromCharCode(ASCII_A+idIdx) + (rowIdx+ROW_RANGE);
        await tS.loadCells(query);
        console.log(query);

        let nullCount = 0;
        for (let i = 0 ; i < ROW_RANGE ; i++)
        {
            const entry = tS.getCell(rowIdx + i, idIdx);
            let id = null;
            if (entry.valueType == null)
            {
                nullCount++;
            }
            else
            {
                id = entry.value;
                lastIdx = rowIdx + i;
            }
            ids.push(id);
        }
        // If all ROW_RANGE cells are empty, stop reading
        if (nullCount === ROW_RANGE)
        {
            break;
        }
        rowIdx += ROW_RANGE;
    }
    ids = ids.slice(0, lastIdx+1);

    return ids;
}

const toastProp = {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
}

function findHeader(value, headers)
{
    for (let h of headers)
    {
        if (h === value) {
            return true ;
        }
    }
    return false;
}

function Scan(props) {
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());

    const [currentTimeSec, setCurrentTimeSec] = useState("");

    useEffect(function() {
        console.log("Update today data " + todayDate);
    }, [todayDate]);

    useEffect(function () {
        async function initialize() {
            console.log('try to read sheet');
            await doc.useServiceAccountAuth(config);
            await doc.loadInfo(); // loads document properties and worksheets
            console.log('Done');

            let tD = new Date();
            let found = false;
            for (let option of dateFormatOptions) {
                // console.log(tD.toLocaleDateString("en-US", option));
                if (doc.sheetsByTitle[tD.toLocaleDateString("en-US", option)]) {
                    found = true;
                    tD = tD.toLocaleDateString("en-US", option);
                    break;
                }
            }
            if (found === false)
            {
                toast.warning(
                    `Please create the spreadsheet for today and reload the app to check in!`, toastProp);
                toast.error(`❗ Could not find spreadsheet with today's date!`, toastProp);
                return;
            }
            const tS = doc.sheetsByTitle[tD];
            console.log("tS");
            console.log(tS);
            console.log(tS.title);
            todaySheet = tS;
            setTodayDate(tD);

            console.log("toasting success");
            toast.success(`✅ Ready to check in!`, toastProp);

            // Find spreadsheet headers
            await tS.loadCells('A1:Z1');
            const header = createHeader(tS);
            columnIndex = header;

            // Find ID list
            idList = await createIds(header.id, tS);
        }
        initialize();

    }, []);

    function findStudentRow(ID) {
        console.log("finding student row " + idList.length);
        for (let i = 0 ; i < idList.length ; i++)
        {
            if (idList[i] != null && idList[i] === ID)
            {
                return i + 1;
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
        const tick = new Date().getTime();
        console.log("reached function " + tick + " " + data);
        const id = parseInt(data);
        if (id > 0)
        {
            scanList.push({tick:tick, id:id});
        }

        return;
    }

    function Recent() {
        const header = (<tr><th>Name</th><th>action</th><th>time</th></tr>);
        return (<table><tbody>{header}
            {recentList.map(entry => (
                <tr key={entry[0]}>
                    <td key="name">{entry[1]}</td>
                    <td key="action">{entry[2]}</td>
                    <td key="time">{entry[3]}</td>
                </tr>
               ))
            }
        </tbody></table>)
    }

    // Set QR code scan updater
    useEffect(() => {
        async function checkId(id)
        {
            console.log("handling scanning " + id);

            // Locate student in the spreadsheet today
            let studentNumber = id;
            let studentRowNumber = findStudentRow(studentNumber);
            const currentTime = getCurrentTime();

            if (studentRowNumber == null) {
                // Student does not exist
                toast.error(`❗ Student ID could not be found!`, toastProp);
            } else {
                // Student ID is found
                console.log("Student ID: " + studentNumber + " Index:" + studentRowNumber);
                const query = String.fromCharCode(ASCII_A) + (studentRowNumber) + ":" +
                              String.fromCharCode(ASCII_A+MAX_COLUMN-1) + (studentRowNumber);
                await todaySheet.loadCells(query);
                const idx = studentRowNumber - 1;
                const name = todaySheet.getCell(idx, columnIndex.name);
                const checkIn = todaySheet.getCell(idx, columnIndex.checkIn);
                const checkOut = todaySheet.getCell(idx, columnIndex.checkOut);

                // Determine action to take
                let action = null;
                if (checkIn.valueType == null) {
                    // Check student in
                    checkIn.value = currentTime;
                    action = "Check In";

                    toast.success(
                        `👋 Checked in ${name.value} at ${currentTime}!`, toastProp);
                } else if (checkOut.valueType == null) {
                    // Check student out
                    checkOut.value = currentTime;
                    action = "Check Out";

                    toast.success(
                        `🚪 Checked out ${name.value} at ${currentTime}!`, toastProp);
                } else {
                    // Student check in and out are both filled
                    toast.warn(
                        `🟡 ${name.value} is already accounted for!`, toastProp);
                }
                if (action != null)
                {
                    console.log(action + " " + currentTime);
                    await addToRecentList([name.value, action, currentTime]);
                    await todaySheet.saveUpdatedCells();
                }
            }
        }
        const interval = setInterval(async () => {
            const tick = new Date().getTime();
            let timeSec = new Date().toLocaleTimeString("en-US", {
                hour12: true,
                hour: "numeric",
                minute: "numeric",
                second: "numeric"
            });
            setCurrentTimeSec(timeSec);
            while (scanHistory.length > 0 && tick - scanHistory[0].tick > CHECK_INTERVAL)
            {
                scanHistory.shift();
            }
            while (scanList.length > 0)
            {
                let entry = scanList.shift();

                if (tick - entry.tick > SCAN_INTERVAL)
                {
                   continue;
                }
                let dup = false;
                for (let h of scanHistory)
                {
                    if (h.id === entry.id)
                    {
                        dup = true;
                        break;
                    }

                }
                if (dup)
                {
                    continue;
                }
                scanHistory.push(entry);
                await checkId(entry.id);
                break;
            }
            return () => clearInterval(interval);
        }, 1000)}, []);

    return (
        <div className="scan">
            <div className="div1" >
                <img className="logo" src={Logo} alt="SVKS"/>
                <h1>
                    SVKS Check In/Out
                </h1>
            </div>
            <div className="clock">
            {todayDate} {currentTimeSec}
            </div>
            <div className="div2">
                <Reader className="reader"
                    onScan={handleScan}
                    myFunc={function () {
                        console.log("helo");
                    }}
                ></Reader>
                <div className="recent">
                    <h2>
                        Recent Check In/Out
                    </h2>
                    <Recent />
                </div>
            </div>
        </div>
    );
}

export default Scan;
