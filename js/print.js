// --- PRINT ENGINE ---
function reprintDoc(docId) {
    const doc = appDB.documents.find(d => d.docId === docId);
    if (!doc) return;
    openPrintPreview(doc.type, doc);
}

function printStatement() {
    window.print();
}

function closePrintView() {
    document.getElementById('print-view').classList.remove('active');
    document.getElementById('app-container').classList.remove('hidden');
}

function setPrintLayout(mode) {
    const container = document.getElementById('print-content');
    if (!container) return;
    container.className = (mode === 'thermal') ? 'preview-thermal bg-white relative text-black mx-auto' : 'preview-a4 bg-white relative text-black mx-auto';
    document.body.className = (mode === 'thermal') ? 'print-thermal' : 'print-a4';
}

function openPrintPreview(type, data) {
    const view = document.getElementById('print-view');
    const content = document.getElementById('print-content');
    if (!view || !content) return;

    let html = '';
    const client = appDB.clients.find(c => c.clientId === data.clientId) || { printName: 'Unknown Client', address: '', gstin: '' };

    if (type === 'INVOICE' || type === 'QUOTATION') {
        const isInv = (type === 'INVOICE');
        html = `
        <div class="p-8 border-b-2 border-black flex justify-between items-start">
            <div>
                <h1 class="text-3xl font-black tracking-tighter">MANGALA BODY BUILDERS</h1>
                <p class="text-xs font-bold leading-tight">BODY REPAIRING, PAINTING & FABRICATION<br>Sr. No. 44, Near Nanekar Garage, Chakan-Talegaon Road,<br>Nanekarwadi, Chakan, Pune - 410501</p>
            </div>
            <div class="text-right">
                <h2 class="text-xl font-bold bg-black text-white px-4 py-1 inline-block">${isInv ? 'TAX INVOICE' : 'QUOTATION'}</h2>
                <p class="text-sm mt-2 font-bold">No: ${data.docNumber}<br>Date: ${data.date}</p>
            </div>
        </div>
        <div class="grid grid-cols-2 p-6 border-b border-black text-sm">
            <div class="border-r border-black pr-4">
                <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">Billed To:</p>
                <p class="font-bold text-lg">${client.printName}</p>
                <p class="whitespace-pre-wrap">${client.address}</p>
                <p class="font-bold mt-2">GSTIN: ${client.gstin}</p>
            </div>
            <div class="pl-6 space-y-1">
                <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">Our Details:</p>
                <p>Proprietor: <strong>MANOJ SAMAL</strong></p>
                <p>Contact: 9850607474 / 9623607474</p>
                <p>GSTIN: <strong>27ALGPS0161C1Z4</strong> (Regular)</p>
                <p>Bank: <strong>HDFC BANK, CHAKAN</strong></p>
                <p>A/c: 50200067644265 (IFSC: HDFC0000492)</p>
            </div>
        </div>
        <table class="w-full text-sm">
            <thead>
                <tr class="bg-gray-100 border-b border-black font-bold">
                    <th class="p-3 text-left border-r border-black w-12">#</th>
                    <th class="p-3 text-left border-r border-black">Description of Goods/Services</th>
                    <th class="p-3 text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody class="min-h-[400px]">
                ${data.lineItems.map((it, idx) => `
                <tr class="border-b border-gray-200">
                    <td class="p-3 border-r border-black text-center">${idx + 1}</td>
                    <td class="p-3 border-r border-black">
                        <div class="font-bold text-xs">${it.date || ''} | ${it.vehicle || ''}</div>
                        <div>${it.workDone}</div>
                    </td>
                    <td class="p-3 text-right font-medium">${it.cost.toFixed(2)}</td>
                </tr>`).join('')}
                ${Array(Math.max(0, 10 - data.lineItems.length)).fill(0).map(() => `
                <tr class="border-b border-gray-100 h-10">
                    <td class="border-r border-black"></td><td class="border-r border-black"></td><td></td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
                <tr class="border-t-2 border-black font-bold">
                    <td colspan="2" class="p-3 text-right border-r border-black">Taxable Amount</td>
                    <td class="p-3 text-right">${data.taxable.toFixed(2)}</td>
                </tr>
                ${isInv ? `
                <tr class="font-bold">
                    <td colspan="2" class="p-2 text-right border-r border-black text-xs">CGST (9%)</td>
                    <td class="p-2 text-right text-xs">${data.cgst.toFixed(2)}</td>
                </tr>
                <tr class="font-bold">
                    <td colspan="2" class="p-2 text-right border-r border-black text-xs">SGST (9%)</td>
                    <td class="p-2 text-right text-xs">${data.sgst.toFixed(2)}</td>
                </tr>` : ''}
                <tr class="bg-black text-white font-black text-lg">
                    <td colspan="2" class="p-4 text-right border-r border-white italic">GRAND TOTAL (ROUNDED)</td>
                    <td class="p-4 text-right">₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}.00</td>
                </tr>
            </tfoot>
        </table>
        <div class="p-6 text-xs italic font-bold border-b border-black">
            Amount in Words: ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
        </div>
        <div class="grid grid-cols-2 p-8 h-48">
            <div class="text-[10px]">
                <p class="font-bold underline mb-2">Terms & Conditions:</p>
                <ol class="list-decimal pl-4 space-y-0.5">
                    <li>Certified that particulars are true and correct.</li>
                    <li>Goods once sold will not be taken back.</li>
                    <li>Subject to Pune Jurisdiction.</li>
                </ol>
            </div>
            <div class="flex flex-col justify-between items-end">
                <p class="font-bold text-xs">For MANGALA BODY BUILDERS</p>
                <p class="border-t border-black w-48 text-center pt-2 font-bold text-[10px]">Authorised Signatory</p>
            </div>
        </div>`;
    } else if (type === 'STATEMENT') {
        html = `
        <div class="p-10">
            <h1 class="text-2xl font-black text-center mb-1">MANGALA BODY BUILDERS</h1>
            <p class="text-center font-bold text-sm mb-6 uppercase tracking-widest border-b-2 border-black pb-2">Client Ledger Statement</p>
            <div class="mb-8 flex justify-between items-end border-b border-dashed border-gray-400 pb-4">
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase">Statement For:</label>
                    <p class="text-xl font-black">${client.printName}</p>
                    <p class="text-sm font-bold text-gray-700 mt-1">Period: ${data.from} to ${data.to}</p>
                </div>
                <div class="text-right text-sm">
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    <p class="font-bold text-lg mt-1">Status: <span class="${data.balance > 0 ? 'text-rose-601' : 'text-emerald-601'}">Balance ₹ ${data.balance.toLocaleString('en-IN')}</span></p>
                </div>
            </div>
            <table class="w-full text-xs text-left border-collapse">
                <thead>
                    <tr class="border-y-2 border-black font-bold uppercase">
                        <th class="py-3 px-2">Date</th>
                        <th class="py-3 px-2">Particulars / Description</th>
                        <th class="py-3 px-2 text-right">Debit (₹)</th>
                        <th class="py-3 px-2 text-right">Credit (₹)</th>
                        <th class="py-3 px-2 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.rows.map(r => `
                    <tr class="border-b border-gray-300 ${r.type === 'TOTAL' ? 'font-black bg-gray-50' : ''}">
                        <td class="py-3 px-2">${r.date}</td>
                        <td class="py-3 px-2">
                           <div class="font-bold">${r.label}</div>
                           <div class="text-[9px] text-gray-500">${r.ref || ''}</div>
                        </td>
                        <td class="py-3 px-2 text-right text-rose-700">${r.dr ? r.dr.toLocaleString('en-IN') : ''}</td>
                        <td class="py-3 px-2 text-right text-emerald-700">${r.cr ? r.cr.toLocaleString('en-IN') : ''}</td>
                        <td class="py-3 px-2 text-right font-bold">${r.bal.toLocaleString('en-IN')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="mt-12 text-[10px] text-center text-gray-400">--- END OF STATEMENT ---</div>
        </div>`;
    }

    content.innerHTML = html;
    setPrintLayout('a4');
    view.classList.add('active');
    document.getElementById('app-container').classList.add('hidden');
}

// Global exports
window.reprintDoc = reprintDoc;
window.printStatement = printStatement;
window.closePrintView = closePrintView;
window.setPrintLayout = setPrintLayout;
window.openPrintPreview = openPrintPreview;
