// --- DATABASE & INIT ---
const defaultDatabase = { "clients": [], "work_entries": [], "documents": [], "payments": [] };
let appDB = {};
let draftWorkItems = [];
let draftQuoteItems = [];
let printPayload = null;

async function initApp() {
    const savedData = localStorage.getItem('mangala_erp_v3');
    if (savedData) {
        appDB = JSON.parse(savedData);
    } else {
        appDB = JSON.parse(JSON.stringify(defaultDatabase));
    }

    // Populate external clients if DB is new/empty
    if (!appDB.clients || appDB.clients.length === 0) {
        // Check if our local JS variable loaded successfully
        if (typeof INITIAL_CLIENTS !== 'undefined') {
            appDB.clients = INITIAL_CLIENTS.map(c => ({ clientId: 'C-' + Date.now() + Math.random(), ...c }));
        } else {
            console.warn('Fallback clients loaded.');
            const fallbackData = [{ "shortName": "Demo Client", "printName": "Demo Client", "Demo Address": "Demo Location", "gstin": "Demo GSTIN" }];
            appDB.clients = fallbackData.map(c => ({ clientId: 'C-' + Date.now() + Math.random(), ...c }));
        }
        saveDB();
    }

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(el => {
        if (!el.value) el.value = today;
    });
    const stmtFrom = document.getElementById('stmt-from');
    if (stmtFrom) stmtFrom.value = today.substring(0, 8) + "01";

    populateMonthDropdowns();
    if (window.refreshUI) window.refreshUI();
    if (window.switchTab) window.switchTab('entries');
}

function populateMonthDropdowns() {
    let options = '<option value="">All Months</option>';
    for (let i = 0; i < 24; i++) {
        let d = new Date(); d.setMonth(d.getMonth() - i);
        options += `<option value="${d.toISOString().substring(0, 7)}">${d.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`;
    }
    document.querySelectorAll('.month-dropdown').forEach(s => s.innerHTML = options);

    const filterWeMonth = document.getElementById('filter-we-month');
    if (filterWeMonth) filterWeMonth.value = new Date().toISOString().substring(0, 7);

    const filterInvMonth = document.getElementById('filter-inv-month');
    if (filterInvMonth) filterInvMonth.value = new Date().toISOString().substring(0, 7);
}

function saveDB() {
    localStorage.setItem('mangala_erp_v3', JSON.stringify(appDB));
}

// --- UTILS & DB ---
function numberToWords(num) {
    if (num === 0) return "Zero Rupees";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertInt(n) {
        if ((n = n.toString()).length > 9) return 'overflow';
        let str = '', c = 0, l = 0, t = 0, h = 0, r = 0;
        let numStr = n.padStart(9, '0');
        c = parseInt(numStr.substring(0, 2));
        l = parseInt(numStr.substring(2, 4));
        t = parseInt(numStr.substring(4, 6));
        h = parseInt(numStr.substring(6, 7));
        r = parseInt(numStr.substring(7, 9));

        if (c > 0) str += (c < 20 ? a[c] : b[Math.floor(c / 10)] + (c % 10 != 0 ? ' ' + a[c % 10] : '')) + 'Crore ';
        if (l > 0) str += (l < 20 ? a[l] : b[Math.floor(l / 10)] + (l % 10 != 0 ? ' ' + a[l % 10] : '')) + 'Lakh ';
        if (t > 0) str += (t < 20 ? a[t] : b[Math.floor(t / 10)] + (t % 10 != 0 ? ' ' + a[t % 10] : '')) + 'Thousand ';
        if (h > 0) str += a[h] + 'Hundred ';
        if (r > 0) {
            if (str != '') str += 'And ';
            str += (r < 20 ? a[r] : b[Math.floor(r / 10)] + (r % 10 != 0 ? ' ' + a[r % 10] : ''));
        }
        return str.trim();
    }
    const parts = num.toFixed(2).split('.');
    let word = convertInt(parseInt(parts[0])) + " Rupees";
    if (parseInt(parts[1]) > 0) word += " And " + convertInt(parseInt(parts[1])) + " Paise";
    return word;
}

function exportJSON() {
    const n = document.createElement('a');
    n.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appDB, null, 2)));
    n.setAttribute("download", `mangala_db_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(n);
    n.click();
    n.remove();
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            const imp = JSON.parse(ev.target.result);
            if (imp.clients) {
                appDB = imp;
                saveDB();
                initApp();
                alert("Success!");
            } else alert("Invalid format.");
        } catch (err) {
            alert("Error.");
        }
    };
    reader.readAsText(file);
}

function resetDatabase() {
    if (confirm("DELETE ALL DATA? This cannot be undone.")) {
        appDB = JSON.parse(JSON.stringify(defaultDatabase));
        saveDB();
        initApp();
    }
}

// --- BULLETPROOF TEST DATA GENERATOR (OVERHAULED) ---
function injectDummyData() {
    const btns = document.querySelectorAll('.dummy-btn');
    if (btns.length > 0 && btns[0].disabled) return;

    btns.forEach(b => {
        if (!b.dataset.txt) b.dataset.txt = b.innerText;
        b.innerHTML = "Generating...";
        b.disabled = true;
    });

    setTimeout(() => {
        try {
            if (appDB.clients.length === 0) {
                alert("Clients data not loaded yet. Refresh the page or try again.");
                btns.forEach(b => { b.innerHTML = b.dataset.txt; b.disabled = false; });
                return;
            }

            const works = [
                "FRONT BUMPER DENTING", "SEAT WELDING", "GLASS FITTING", "PAINT TOUCHUP",
                "LOCK SETTING", "DIESEL TANK ZALI", "GUARD PIPE FITTING", "MUDGUARD REPAIR",
                "WIRING CHECK", "FLOOR MATTING", "ROOF LEAKAGE FIX", "DOOR ALIGNMENT",
                "WHEEL CAP FITTING", "BUMPER PAINTING", "CABIN CLEANING"
            ];
            const vehs = ["MH14CW7474", "EICHER BUS", "MH12FZ8311", "MH04G7107", "MH06S7836", "MH14GD9295", "MH12AB1234"];
            const methods = ["NEFT", "Cash", "GPay", "Cheque"];

            // Restrict Dates: Oct 1, 2025 to Dec 31, 2025
            const startT = new Date('2025-10-01T00:00:00').getTime();
            const endT = new Date('2025-12-31T23:59:59').getTime();
            const rndDate = () => {
                const t = startT + Math.random() * (endT - startT);
                return new Date(t).toISOString().split('T')[0];
            };

            const getRndWork = () => works[Math.floor(Math.random() * works.length)];
            const getRndVeh = () => vehs[Math.floor(Math.random() * vehs.length)];
            const getRndClient = () => appDB.clients[Math.floor(Math.random() * appDB.clients.length)].clientId;
            const timestamp = Date.now();

            // 1. Generate 100 Work Entries (Mix of normal and stress-test massive entries)
            for (let i = 0; i < 100; i++) {
                // Force every 10th entry to be a stress-test entry (50 to 100 items)
                let isMassive = (i % 10 === 0);
                let itemsCount = isMassive ? Math.floor(Math.random() * 51 + 50) : Math.floor(Math.random() * 5 + 1);

                let items = [];
                let totalCost = 0;
                for (let j = 0; j < itemsCount; j++) {
                    let cost = Math.floor(Math.random() * 50 + 1) * 100;
                    totalCost += cost;
                    // Add index to massive descriptions so they are visually distinct when testing UI
                    let desc = getRndWork() + (isMassive ? ` (Part #${j + 1})` : '');
                    items.push({ workDone: desc, cost: cost });
                }

                appDB.work_entries.push({
                    entryId: `WE-${timestamp}-${i}`,
                    date: rndDate(),
                    clientId: getRndClient(),
                    vehicle: getRndVeh(),
                    items: items,
                    totalCost: totalCost,
                    status: 'UNBILLED',
                    docId: null
                });
            }

            // 2. Generate 15 Bills (Invoices)
            let unb = appDB.work_entries.filter(w => w.status === 'UNBILLED');
            for (let i = 0; i < 15; i++) {
                if (unb.length === 0) break;

                // Grab 1 to 3 random unbilled entries (which may include the massive ones generated above)
                let count = Math.floor(Math.random() * 3 + 1);
                let chk = unb.splice(0, count);
                if (chk.length === 0) break;

                let cid = chk[0].clientId;
                let tax = 0;
                let lItms = [];

                chk.forEach(w => {
                    w.clientId = cid; // Force same client for the bulk bill
                    w.status = 'BILLED';
                    w.items.forEach(it => {
                        tax += it.cost;
                        lItms.push({ date: w.date, vehicle: w.vehicle, workDone: it.workDone, cost: it.cost });
                    });
                });

                let docId = `DOC-${timestamp}-${i}`;
                chk.forEach(w => w.docId = docId);

                let isTaxable = (i % 3 !== 0); // 2/3rds are Taxable, 1/3rd Non-Taxable (Memo)
                let cgst = isTaxable ? tax * 0.09 : 0;
                let sgst = isTaxable ? tax * 0.09 : 0;
                let grandTotal = isTaxable ? tax * 1.18 : tax;

                appDB.documents.push({
                    docId: docId,
                    type: 'INVOICE',
                    docNumber: 'INV-' + (1000 + i),
                    clientId: cid,
                    date: rndDate(),
                    status: (i % 2 === 0) ? 'DRAFT' : 'LOCKED',
                    isTaxable: isTaxable,
                    lineItems: lItms,
                    taxable: tax,
                    cgst: cgst,
                    sgst: sgst,
                    grandTotal: grandTotal
                });
            }

            // 3. Generate 15 Quotes (Mix of normal and massive)
            for (let i = 0; i < 15; i++) {
                let isMassive = (i % 5 === 0); // 3 massive quotes
                let itemsCount = isMassive ? Math.floor(Math.random() * 51 + 50) : Math.floor(Math.random() * 5 + 1);

                let taxable = 0;
                let lineItems = [];
                for (let j = 0; j < itemsCount; j++) {
                    let cost = Math.floor(Math.random() * 100 + 10) * 100;
                    taxable += cost;
                    let desc = getRndWork() + (isMassive ? ` (Sub-task #${j + 1})` : '');
                    lineItems.push({ vehicle: getRndVeh(), workDone: desc, cost: cost });
                }

                appDB.documents.push({
                    docId: `DOC-Q-${timestamp}-${i}`,
                    type: 'QUOTATION',
                    docNumber: 'EST-' + (5000 + i),
                    clientId: getRndClient(),
                    date: rndDate(),
                    lineItems: lineItems,
                    taxable: taxable,
                    cgst: 0,
                    sgst: 0,
                    grandTotal: taxable,
                    isConverted: (i % 3 === 0)
                });
            }

            // 4. Generate 40 Payments
            for (let i = 0; i < 40; i++) {
                appDB.payments.push({
                    paymentId: `PAY-${timestamp}-${i}`,
                    date: rndDate(),
                    clientId: getRndClient(),
                    amount: Math.floor(Math.random() * 100 + 5) * 500,
                    method: methods[Math.floor(Math.random() * methods.length)]
                });
            }

            saveDB();
            if (window.refreshUI) window.refreshUI();
            btns.forEach(b => {
                b.innerHTML = b.dataset.txt;
                b.disabled = false;
            });
        } catch (e) {
            console.error(e);
            alert("Error generating data.");
            btns.forEach(b => { b.innerHTML = b.dataset.txt; b.disabled = false; });
        }
    }, 50);
}

// Global exports
window.appDB = appDB;
window.draftWorkItems = draftWorkItems;
window.draftQuoteItems = draftQuoteItems;
window.printPayload = printPayload;
window.initApp = initApp;
window.saveDB = saveDB;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.resetDatabase = resetDatabase;
window.injectDummyData = injectDummyData;
window.numberToWords = numberToWords;
