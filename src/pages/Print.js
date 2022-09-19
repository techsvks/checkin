import React, { useEffect, useRef, useState } from "react";
import "./Scan.css"
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import Logo from "../images/Logo.png";
import { useDebounce } from "use-debounce";
import { useReactToPrint } from "react-to-print";
import { ToPrint } from "../components/ToPrint";
import { sleep, toastProp } from "../Util";
import text from "../api/text";

const selectedIds = new Set();

function Print(props) {
    const [inputText, setInputText] = useState("");
    const [studentList, setStudentList] = useState([]);
    const [printList, setPrintList] = useState([]);
    const [searchQuery] = useDebounce(inputText, 50);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);

    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    useEffect(function () {
        async function initialize() {
            toast.dismiss();
            console.log("Wait for sheet");
            const prop = toastProp;
            prop.autoClose = false;
            console.log(prop);
            const initNoti = toast.info(text.loading, prop);
            while (!props.doc.isOpen()) {
                console.log("check");
                await sleep(1.0);
            }

            let sheetInfo = await props.doc.findMostRecentSheet();

            if (!sheetInfo)
            {
                toast.dismiss(initNoti);
                prop.autoClose = 3000;
                toast.error(text.failedToOpen, toastProp);
                return;
            }
            console.log(sheetInfo.date);
            const idList = sheetInfo.idList
            const nameIdx = sheetInfo.header.name;
            const nameList = await props.doc.readList(nameIdx);
            const list = [];
            for (let i = 0 ; i < Math.min(idList.length, nameList.length); i++)
            {
               list.push({id: idList[i],  name: nameList[i]});
            }
            setStudentList(list);

            const printIdx = sheetInfo.header.print;
            if (printIdx)
            {
                setPrintList(await props.doc.readList(printIdx));
            }
            else
            {
                setPrintList([]);
            }
            console.log("Sheet read " + list.length);
            prop.type = toast.TYPE.SUCCESS;
            prop.autoClose = 3000;
            prop.render = text.succeededToOpen;
            toast.update(initNoti, prop);
        }
        initialize();
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
                        let resultString = `${row.name}:  ${row.id}`;
                        let resultObject = {
                            text: resultString,
                            name: row.name,
                            id: row.id.toString(),
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
        [searchQuery, studentList]
    );

    async function addMarkedStudents() {
        let results = [];

        for (let i = 0 ; i < printList.length ; i++)
        {
            if (printList[i] && printList[i].toLowerCase() === "x" && studentList[i].id != null)
            {
                const entry = studentList[i];
                let resultString = `${entry.name}:  ${entry.id}`;
                let resultObject = {
                    text: resultString,
                    name: entry.name,
                    id: entry.id.toString()
                };
                results.push(resultObject);
                selectedIds.add(entry.id);
            }
        }
        setSelectedCodes([...selectedCodes, ...results]);
    }

    return (
        <div id="print">
            <div id="title">
                <img id="logo" src={Logo} alt="SVKS" ></img>
                <h1> Print QR Codes </h1>
            </div>
            <div id="printContents" >
                <input id="search"
                    placeholder={"Search for student or enter a number..."}
                    value={inputText}
                    onChange={(event) => {
                        setInputText(event.target.value);
                    }} />

                {searchResults.map((result) => {
                    return (
                        <div key={result.id} id="searchResult"
                            onClick={function () {
                                if (!selectedIds.has(result.id)) {
                                    setSelectedCodes([...selectedCodes, result]);
                                    selectedIds.add(result.id);
                                }
                            }}>
                            <h4> {result.text} </h4>
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
