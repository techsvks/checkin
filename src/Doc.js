import { spreadsheetID } from "./api/spreadsheetID";
import config from "./api/config";
import header from "./api/header";

const { GoogleSpreadsheet } = require("google-spreadsheet");

const MAX_COLUMN = 26;
const ASCII_A = 65;

let sheetKey;
if (process.env.NODE_ENV === "development")
{
    console.log("Development mode");
    sheetKey = "development";
}
else
{
    console.log("Production mode");
    sheetKey = "production";
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

const _MS_PER_DAY = 1000 * 60 * 60 * 24;
function dateDiffInDays(a, b) {
    // https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.abs(Math.floor((utc2 - utc1) / _MS_PER_DAY));
}


function findHeader(value, headers)
{
    for (let h of headers)
        if (h === value) return true ;

    return false;
}

class Doc {
    constructor() {
        console.log("Create Doc class");
        const doc = new GoogleSpreadsheet(spreadsheetID[sheetKey]);
        const sheetInfo = {sheet: null, date: null, header: null, cachedList: {}};
        this.state = {doc: doc, initialized: false, sheetInfo: sheetInfo};
    }

    async openDoc() {
        console.log('try to read sheet');
        await this.state.doc.useServiceAccountAuth(config);
        console.log('Auth Done');
        await this.state.doc.loadInfo(); // loads document properties and worksheets
        console.log('Done');
        this.state.initialized = true;
    }

    isOpen() {
        return this.state.initialized;
    }

    getCachedList() {
        return new Set(Object.keys(this.state.sheetInfo.cachedList));
    }

    async sheetsByTitle(arg) {
        this.state.sheetInfo.sheet = await this.state.doc.sheetsByTitle[arg];
        this.state.sheetInfo.date = arg;

        return this.state.sheetInfo;
    }

    async sheetsByDate(date) {
        for (let option of dateFormatOptions) {
            const str = date.toLocaleDateString("en-US", option);
            if (this.state.sheetInfo.date && str === this.state.sheetInfo.date)
            {
                console.log("Found " + str);
                console.log(this.state.sheetInfo);
                return this.state.sheetInfo;
            }
        }
        let found = false;
        for (let option of dateFormatOptions) {
            const dateStr = date.toLocaleDateString("en-US", option);
            const sheet = await this.state.doc.sheetsByTitle[dateStr];
            if (sheet) {
                this.state.sheetInfo.date = dateStr;
                this.state.sheetInfo.sheet = sheet;
                found = true;
                break;
            }
        }
        if (!found)
            return null;

        console.log("Found sheet " + this.state.sheetInfo.sheet);

        // Find spreadsheet headers
        await this.state.sheetInfo.sheet.loadCells('A1:Z1');
        const header = this.createHeader(this.state.sheetInfo.sheet);
        console.log(header);

        this.state.sheetInfo.header = header;

        return this.state.sheetInfo;
    }

    createHeader(tS = this.state.sheetInfo.sheet)
    {
        let idIdx = null;
        let nameIdx = null;
        let classIdx = null;
        let checkInIdx = null;
        let checkOutIdx = null;
        let printIdx = null;
        if (!tS)
            return {};
        for (let i = 0 ; i < Math.min(MAX_COLUMN, tS.columnCount) ; i++)
        {
            const entry = tS.getCell(0, i);
            if (entry.valueType == null) continue;
            nameIdx = (findHeader(entry.value, header.name)) ? i : nameIdx;
            idIdx = (findHeader(entry.value, header.id)) ? i : idIdx;
            classIdx = (findHeader(entry.value, header.class)) ? i : classIdx;
            checkInIdx = (findHeader(entry.value, header.checkIn)) ? i : checkInIdx;
            checkOutIdx = (findHeader(entry.value, header.checkOut)) ? i : checkOutIdx;
            printIdx = (findHeader(entry.value, header.print)) ? i : printIdx;
        }
        return {id:idIdx, name:nameIdx, class:classIdx, checkIn:checkInIdx, checkOut:checkOutIdx, print:printIdx};
    }

    async readList(idIdx, tS = this.state.sheetInfo.sheet)
    {
        if (idIdx in this.state.sheetInfo.cachedList)
            return this.state.sheetInfo.cachedList[idIdx];

        let rowIdx = 0;
        const ROW_RANGE = 100;
        let ids = [];
        if (!tS)
            return [];
        let lastIdx = null;
        const rowSize = tS.rowCount;
        while (rowIdx < rowSize-1)
        {
            // Read ROW_RANGE cell
            const increment = Math.min(rowSize - rowIdx, ROW_RANGE);
            const query = String.fromCharCode(ASCII_A+idIdx) + (rowIdx+1) + ":" +
                          String.fromCharCode(ASCII_A+idIdx) + (rowIdx+increment);
            console.log(toString(idIdx) + " " + query);
            await tS.loadCells(query);

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
            if (nullCount === ROW_RANGE) break;
            rowIdx += increment;
        }
        ids[0] = "";
        ids = ids.slice(0, lastIdx+1);

        this.state.sheetInfo.cachedList[idIdx] = ids;

        return ids;
    }

    async getStudent(id) {
        const todaySheet = this.state.sheetInfo.sheet;
        if (!todaySheet)
            return null;

        // Locate student in the spreadsheet today
        let studentNumber = id;
        let studentRowNumber = await this.findStudentRow(studentNumber);

        if (!studentRowNumber) {
            return null;
        }

        const header = this.state.sheetInfo.header;
        // Student ID is found
        console.log("Student ID: " + studentNumber + " Index:" + studentRowNumber);
        const query = String.fromCharCode(ASCII_A) + (studentRowNumber) + ":" +
                      String.fromCharCode(ASCII_A+MAX_COLUMN-1) + (studentRowNumber);
        console.log(query);
        await todaySheet.loadCells(query);
        const idx = studentRowNumber - 1;
        console.log("Get Cell " + idx + " " + header.name);
        const name = todaySheet.getCell(idx, header.name);
        const checkIn = todaySheet.getCell(idx, header.checkIn);
        const checkOut = todaySheet.getCell(idx, header.checkOut);

        return {idx: idx, name: name, checkIn: checkIn, checkOut: checkOut};
    }

    async updateCell()
    {
        const todaySheet = this.state.sheetInfo.sheet;
        if (!todaySheet)
            return null;
        await todaySheet.saveUpdatedCells();
    }

    async findStudentRow(ID) {
        const idList = await this.readList(this.state.sheetInfo.header.id);
        console.log("finding student row " + idList.length);
        for (let i = 0 ; i < idList.length ; i++)
        {
            if (idList[i] && idList[i] === ID) return i + 1;
        }
        return null;
    }

    async findMostRecentSheet() {
        let sheetDate = new Date();
        let today = new Date();
        while (dateDiffInDays(today, sheetDate) < 40)
        {
            const sheetInfo = await this.sheetsByDate(sheetDate);
            if (sheetInfo)
                return sheetInfo;
            sheetDate.setDate(sheetDate.getDate() - 1);
        }
        return null;
    }
}

export default Doc;

