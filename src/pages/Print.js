import React, { useEffect, useRef, useState } from "react";
import "./Scan.css"
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import Logo from "../images/Logo.png";
import { useDebounce } from "use-debounce";
import { useReactToPrint } from "react-to-print";
import { ToPrint } from "../components/ToPrint";
import { sleep, toastProp, CODE_PER_PAGE, CODE_PER_SCREEN } from "../Util";
import text from "../api/text";

function Print(props) {
    const [inputText, setInputText] = useState("");
    const [studentList, setStudentList] = useState([]);
    const [printList, setPrintList] = useState([]);
    const [searchQuery] = useDebounce(inputText, 50);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);
    const [displayedCodes, setDisplayedCodes] = useState([]);
    const [showMarked, setShowMarked] = useState(false);
    const [showSearched, setShowSearched] = useState(false);
    const [pageNum, setPageNum] = useState(0);

    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    useEffect(function () {
        async function initialize() {
            toast.dismiss();
            while (!props.doc.isOpen()) {
                await sleep(0.1);
            }

            let sheetInfo = await props.doc.findMostRecentSheet();

            if (!sheetInfo)
            {
                const prop = toastProp;
                prop.autoClose = 3000;
                toast.error(text.failedToOpen, prop);
                return;
            }
            const cachedData = props.doc.getCachedList();
            let initNoti = null;
            if (!cachedData.has(sheetInfo.header.id.toString()) ||
                !cachedData.has(sheetInfo.header.name.toString()) ||
                (sheetInfo.header.print &&
                 !(sheetInfo.header.print in cachedData) ))
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

            const printIdx = sheetInfo.header.print;
            if (printIdx)
            {
                setPrintList(await props.doc.readList(printIdx));
            }

            console.log("Sheet read " + list.length);
            if (initNoti) {
                const prop = toastProp;
                prop.type = toast.TYPE.SUCCESS;
                prop.render = text.succeededToOpen;
                prop.autoClose = 3000;
                toast.update(initNoti, prop);
            }
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

    useEffect(
        () => {
            setShowMarked(printList.length > 0);
        }, [printList]
    );
    useEffect(
        () => {
            setShowSearched(searchResults.length > 0)
        }, [searchResults]
    );
    useEffect(
        () => {
            const length = selectedCodes.length;
            if (length > CODE_PER_SCREEN)
            {
                const startIdx = pageNum * CODE_PER_SCREEN;
                const count = Math.min(CODE_PER_SCREEN, length - startIdx);
                setDisplayedCodes(selectedCodes.slice(startIdx,startIdx+count));
            }
            else
            {
                setDisplayedCodes(selectedCodes);
                setPageNum(0);
            }
        }, [selectedCodes, pageNum]
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
            }
        }
        setSelectedCodes([...selectedCodes, ...results]);
    }

    function addSelected() {
        let results = [];
        for (let i = 0 ; i < searchResults.length ; i++)
        {
            let result = searchResults[i];
            let add = true;
            selectedCodes.map((code) => {
                if (code.id === result.id)
                {
                    add = false;
                }
                return ""
            });
            if (add)
            {
                results.push(result);
            }
        }
        setSelectedCodes([...selectedCodes, ...results]);
    }

    function addAll() {
        let results = [];
        setSelectedCodes([]);
        let ids = new Set();
        for (const row of studentList) {
            if (row.id == null || row.id.length === 0 || row.name == null || ids.has(row.id))
            {
                continue;
            }
            console.log(row)
            let resultString = `${row.name}:  ${row.id}`;
            let resultObject = {
                text: resultString,
                name: row.name,
                id: row.id.toString(),
            };
            results.push(resultObject);
            ids.add(row.id);
        }
        setSelectedCodes(results);
    }

    function removeAll() {
        setSelectedCodes([]);
    }

    function movePrev() {
        if (pageNum > 0)
        {
            setPageNum(pageNum - 1);
        }
    }

    function moveNext() {
        if (selectedCodes.length > (pageNum + 1) * CODE_PER_SCREEN)
        {
            setPageNum(pageNum + 1);
        }
    }

    function printCodes() {
        let pages = [];
        for (let i = 0 ; i < selectedCodes.length ; i += CODE_PER_PAGE)
        {
            const count = Math.min(CODE_PER_PAGE, selectedCodes.length - i);
            pages.push(selectedCodes.slice(i, i + count));
        }
        return pages.map((page) => (
                    <div id="qrList">
                        {page.map((code) => (
                            <div key={code.id} id="qrCode" >
                                <QRCode size={160} value={code.id} />
                                <p id="qrName" >
                                    {code.text}
                                </p>
                            </div>
                         ))}
                    </div>
               ));
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
                                let add = true;
                                selectedCodes.map((code) => {
                                    if (code.id === result.id)
                                    {
                                        add = false;
                                    }
                                    return ""
                                });
                                if (add)
                                {
                                    setSelectedCodes([...selectedCodes, result]);
                                }
                            }}>
                            <h4> {result.text} </h4>
                        </div>
                    );
                })}
            </div>
            {displayedCodes.length > 0 && (
                <>
                    <div id="selected">
                        {displayedCodes.map((code) => (
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
                                    }}
                                > X </button>
                            </div>
                        ))}
                    </div>
                    <ToPrint ref={printRef}>
                        {printCodes()}
                    </ToPrint>
                </>
            )}
            {selectedCodes.length > CODE_PER_SCREEN && (
                <div id="pageControl" hidden={selectedCodes.length <= CODE_PER_SCREEN}>
                    <button id="prevPage" onClick={movePrev}> &lt;&lt; </button>
                    <p id="pageNum"> {pageNum+1} </p>
                    <button id="nextPage" onClick={moveNext}> &gt;&gt; </button>
                </div>
            )}
            <button id="printButton" hidden={displayedCodes.length === 0} onClick={handlePrint}>
                Print codes
            </button>
            <button id="selectSearched" hidden={!showSearched} onClick={addSelected}>
                Select all search results
            </button>
            <button id="selectAll" onClick={addAll}>
                Select all
            </button>
            <button id="selectMarked" hidden={!showMarked} onClick={addMarkedStudents}>
                Print codes for marked students.
            </button>
            <button id="removeAll" hidden={(!selectedCodes.length > 0)} onClick={removeAll}>
                Remove all
            </button>
        </div>
    );
}

export default Print;
