import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reader from "../components/Reader";
import { sleep, toastProp } from "../Util";

import "./Scan.css";
import Logo from "../images/Logo.png";
import text from "../api/text";

const SCAN_INTERVAL = 1000;
const CHECK_INTERVAL = 5000;
const scanList = [];
const scanHistory = [];
const recentList = [];
let shutter = false;

let recentCount = 0;
function addToRecentList(value) {
    recentList.push([recentCount, ...value]);
    if (recentList.length > 5) recentList.shift();
    recentCount += 1;
}


function Scan(props) {
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());
    const [currentTimeSec, setCurrentTimeSec] = useState("");

    useEffect(function() {
        console.log("Update today data " + todayDate);
    }, [todayDate]);

    useEffect(function () {
        async function initialize() {
            toast.dismiss();
            console.log("Wait for sheet");
            const prop = toastProp;
            prop["autoClose"] = false;
            const initNoti = toast.info(text.loading, toastProp);
            while (!props.doc.isOpen()) {
                console.log("check");
                await sleep(1.0);
            }
            console.log("done");
            let tD = new Date();
            const result = await props.doc.sheetsByDate(tD);
            if (!result)
            {
                toast.dismiss(initNoti);
                prop.autoClose = 3000;
                prop.type = toast.TYPE.WARNING;
                toast.warning(
                    text.reloadPage, toastProp);
                prop.type = toast.TYPE.ERROR;
                toast.error(text.noSheet, toastProp);
                return;
            }
            const tS = result.sheet;
            const date = result.date;
            console.log("tS");
            console.log(tS.title);
            setTodayDate(date);

            prop.type = toast.TYPE.SUCCESS;
            prop.autoClose = 3000;
            prop.render = text.loaded;
            toast.update(initNoti, prop);
        }
        initialize();

    }, [props]);

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
        if (id > 0) scanList.push({tick:tick, id:id});

        return;
    }

    function checkShutter() {
        const ret = shutter;
        shutter = false;
        return ret;
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

    function checkDuplicate(id) {
        for (let h of scanHistory)
        {
            if (h.id === id) return true;
        }
        return false;
    }

    // Set QR code scan updater
    useEffect(() => {
        async function checkId(id)
        {
            console.log("handling scanning " + id);

            // Locate student in the spreadsheet today
            const currentTime = getCurrentTime();

            const info = await props.doc.getStudent(id);
            if (!info)
            {
                // Student does not exist
                toast.error(text.noStudent, toastProp);
                return;
            }
            console.log("Student ID: " + id + " Idx:  " + info.idx);
            // Determine action to take
            let action = null;
            if (info.checkIn.valueType == null) {
                // Check student in
                info.checkIn.value = currentTime;
                action = "Check In";

                toast.success(text.checkIn.format(info.name.value, currentTime), toastProp);
            } else if (info.checkOut.valueType == null) {
                // Check student out
                info.checkOut.value = currentTime;
                action = "Check Out";

                toast.success(text.checkOut.format(info.name.value, currentTime), toastProp);
            } else {
                // Student check in and out are both filled
                toast.warn(
                    text.alreadyDone.format(info.name.value), toastProp);
                return;
            }
            console.log(action + " " + currentTime);
            addToRecentList([info.name.value, action, currentTime]);
            await props.doc.updateCell();
            shutter = true;
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

                if (tick - entry.tick > SCAN_INTERVAL || checkDuplicate(entry.id)) continue;
                scanHistory.push(entry);
                await checkId(entry.id);
                break;
            }
            return () => clearInterval(interval);
        }, 200)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div id="scan">
            <div id="title" >
                <img id="logo" src={Logo} alt="SVKS"/>
                <h1> SVKS Check In/Out </h1>
            </div>
            <div id="clock">
            {todayDate} {currentTimeSec}
            </div>
            <div id="contents">
                <div id="reader">
                    <Reader
                        onScan={handleScan}
                        periodic={checkShutter}/>
                </div>
                <div id="recent">
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
