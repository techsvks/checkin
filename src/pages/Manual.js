import React, { useEffect, useState } from "react";
import "./Scan.css"
import { toast } from "react-toastify";
import Logo from "../images/Logo.png";
import { useDebounce } from "use-debounce";
import { sleep, toastProp } from "../Util";
import text from "../api/text";

const selectedIds = new Set();

function getCurrentTime() {
    return new Date().toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
    });
}

function Manual(props) {
    const [inputText, setInputText] = useState("");
    const [studentList, setStudentList] = useState([]);
    const [searchQuery] = useDebounce(inputText, 50);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedId, selectIdImpl] = useState({id:-1});
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());
    const [currentTimeSec, setCurrentTimeSec] = useState("");

    useEffect(function () {
        async function initialize() {
            toast.dismiss();
            while (!props.doc.isOpen()) {
                await sleep(0.1);
            }

            let tD = new Date();
            const sheetInfo = await props.doc.sheetsByDate(tD);

            if (!sheetInfo)
            {
                const prop = toastProp;
                prop.autoClose = 3000;
                toast.error(text.failedToOpen, toastProp);
                return;
            }
            const cachedData = props.doc.getCachedList();
            let initNoti = null;
            if (!cachedData.has(sheetInfo.header.id.toString()) ||
                !cachedData.has(sheetInfo.header.name.toString()) )
            {
                console.log("Data should be loaded");
                const prop = toastProp;
                prop.autoClose = false;
                initNoti = toast.info(text.loading, prop);
            }


            console.log(sheetInfo.date);
            const idIdx = sheetInfo.header.id;
            const idList = await props.doc.readList(idIdx);
            const nameIdx = sheetInfo.header.name;
            const nameList = await props.doc.readList(nameIdx);
            const list = [];
            for (let i = 0 ; i < Math.min(idList.length, nameList.length); i++)
            {
               list.push({id: idList[i],  name: nameList[i]});
            }
            setStudentList(list);

            console.log("Sheet read " + list.length);
            if (initNoti) {
                const prop = toastProp;
                prop.type = toast.TYPE.SUCCESS;
                prop.autoClose = 3000;
                prop.render = text.succeededToOpen;
                toast.update(initNoti, prop);
            }
            setTodayDate(sheetInfo.date);
        }
        initialize();
        return () => toast.dismiss();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
        () => {
            async function findStudents(text) {
                let results = [];

                for (const row of studentList) {
                    if (results.length > 4) break;
                    if ((row.id && row.id.toString().includes(text)) ||
                        (row.name && row.name.toString().includes(text)))
                    {
                        let resultString = `${row.id}: ${row.name}`;
                        let resultObject = {
                            id: row.id,
                            name: row.name,
                            text: resultString,
                        };
                        results.push(resultObject);
                        selectedIds.add(row.id);
                    }
                }
                return results;
            }
            async function query() {
                if (searchQuery) {
                    let sr = await findStudents(searchQuery);
                    if (sr.length > 0) setSearchResults(sr);
                } else {
                    setSearchResults([]);
                }
            }
            query();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [searchQuery, studentList]
    );

    useEffect(() => {
        const interval = setInterval(async () => {
            let timeSec = new Date().toLocaleTimeString("en-US", {
                hour12: true,
                hour: "numeric",
                minute: "numeric",
                second: "numeric"
            });
            setCurrentTimeSec(timeSec);
            return () => clearInterval(interval);
        }, 200)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkIn = (id) => {
        console.log('Check in ' + id);
        const currentTime = getCurrentTime();
        selectedId.checkIn.value = currentTime;
        props.doc.updateCell();
        toast.success(text.checkIn.format(selectedId.name.value, currentTime), toastProp);
    }

    const checkOut = (id) => {
        console.log('Check out ' + id);
        const currentTime = getCurrentTime();
        selectedId.checkOut.value = currentTime;
        props.doc.updateCell();
        toast.success(text.checkOut.format(selectedId.name.value, currentTime), toastProp);
    }

    const selectId = async (id) => {
        const info = await props.doc.getStudent(id);
        console.log("Select " + selectedId.id + " " + id);
        console.log(selectedId);
        if (!selectedId || !selectedId.id || selectedId.id !== id)
        {
            console.log("Selected");
            console.log(info);
            selectIdImpl({...info, id:id});
        }
        else
        {
            console.log("Deselect");
            selectIdImpl({id:-1});
        }
    }

    const showEntries = (result) => {
        let cIn, cOut;
        let cInDisabled;
        let cOutDisabled;
        cInDisabled = cOutDisabled = false;
        cIn = "Check In";
        cOut = "Check Out";
        const hidden = (selectedId.id !== result.id);
        if (!hidden)
        {
            if (selectedId.checkIn.valueType)
            {
                cIn = "Check In: " + selectedId.checkIn.formattedValue;
                cInDisabled = true;
            }
            if (selectedId.checkOut.valueType)
            {
                cOut = "Check Out: " + selectedId.checkOut.formattedValue;
                cOutDisabled = true;
            }
        }
//                    <Dropdown.Item id="searchResult" onSelect={() => {checkIn(result.idx); }}>{cIn}</Dropdown.Item>
/*
        return (<Dropdown title={result.text} key={result.idx} id="searchResult">
                    <Dropdown.Item id="checkInOut" onSelect={() => {checkIn(result.idx); }} disabled={true}>{cIn}</Dropdown.Item>
                    <Dropdown.Item id="checkInOut" onSelect={() => {checkOut(result.idx); }}>{cOut}</Dropdown.Item>
                </Dropdown>);
*/
        return (<div><button type="button" key={result.id} id="searchResult" onClick={async () => {await selectId(result.id);}}> {result.text} </button>
                    <div hidden={hidden}>
                        <button type="button" key="checkIn" id="checkInOut" disabled={cInDisabled} onClick={() => {checkIn(result.id)}}> {cIn} </button>
                        <button type="button" key="checkOut" id="checkInOut" disabled={cOutDisabled} onClick={() => {checkOut(result.id)}}> {cOut} </button>
                    </div>
                </div>);
    }

    return (
        <div id="manual">
            <div key="title" id="title">
                <img id="logo" src={Logo} alt="SVKS" ></img>
                <h1> Manual Check In/Out </h1>
            </div>
            <div id="clock">
            {todayDate} {currentTimeSec}
            </div>
            <div id="printContents" >
                <input id="search"
                    placeholder={"Search for student or enter a number..."}
                    value={inputText}
                    onChange={(event) => {
                        setInputText(event.target.value);
                    }} />

                {   searchResults.map((result) => {
                    return showEntries(result);
                })}
            </div>
        </div>
    );
}

export default Manual;
