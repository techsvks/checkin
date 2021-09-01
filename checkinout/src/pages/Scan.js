import React, { useEffect, useState } from "react";
import QrReader from "react-qr-scanner";
import config from "../api/config";
const { GoogleSpreadsheet } = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(
    "1sj8Hk1nN-pushHCR-pKLoNJWHQMIOnL1SBTueItOLvQ"
);

function Scan(props) {
    const [result, setResult] = useState("None");
    const [sheetDoc, setSheetDoc] = useState({});
    const [nameSheet, setNameSheet] = useState({});
    const [todaySheet, setTodaySheet] = useState({});
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString());

    useEffect(
        function () {
            async function initializeWorker() {
                await doc.useServiceAccountAuth(config);
                await doc.loadInfo(); // loads document properties and worksheets
                console.log(doc.title);
                await doc.updateProperties({ title: "renamed doc" });
                const nS = doc.sheetsByTitle["People"];
                setNameSheet(nS);
                console.log(doc.sheetsByTitle[todayDate]);
                if (!doc.sheetsByTitle[todayDate]) {
                    console.log(todayDate);
                    console.log("here");
                    const tS = await doc.addSheet({ title: todayDate });
                    setTodaySheet(tS);
                }

                // const rows = await sheet.getRows(); // can pass in { limit, offset }
                // console.log(sheet);
                // console.log(rows);
                // console.log(rows[0].Name); // 'Larry Page'

                // await rows[1]./(); // save updates
            }
            initializeWorker();
        },
        [todayDate]
    );

    function handleScan(data) {
        if (data && data.text) {
            console.log(data);
            setResult(data);

            let studentNumber = data.text;
        }
    }

    function handleError(err) {
        console.error(err);
    }

    const previewStyle = {
        height: 240,
        width: 320,
    };

    return (
        <div>
            asdf
            <div>
                <QrReader
                    delay={100}
                    style={previewStyle}
                    onError={handleError}
                    onScan={handleScan}
                />
                <p>{result?.text}</p>
            </div>
        </div>
    );
}

export default Scan;
