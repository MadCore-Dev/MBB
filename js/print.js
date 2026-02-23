// --- CENTRAL COMPANY DETAILS CONFIGURATION ---
const COMPANY_DETAILS = {
    name: "Mangala Body Builders",
    tagline: "We Undertake All Kinds of Bus Repairing, Painting, Cushion Works etc.",
    address: "Near Kajale Petrol Pump, 456, Moshi, Tal. Haveli, Pune - 410501.",
    gstin: "27AVUPS1614F1ZA",
    phone1: "Santosh : 9822325571",
    phone2: "Prashant : 9822356479",
    quoteDisclaimers: [
        "Note: GST will be applied on final estimation.",
        "Note: Estimates may be revised if required after dismantling the vehicle."
    ]
};

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

    // Explicitly prevent CSS from clipping dynamic content
    container.style.overflow = 'visible';
    container.style.height = 'auto'; // Let it stretch naturally

    // Target our newly created layout wrappers
    const a4View = container.querySelector('.a4-layout-container');
    const thermalView = container.querySelector('.thermal-layout-container');

    if (mode === 'thermal') {
        container.className = 'preview-thermal bg-white relative text-black mx-auto print:mx-0 print:w-full print:shadow-none';
        document.body.className = 'print-thermal';
        if (a4View) a4View.style.display = 'none';
        if (thermalView) thermalView.style.display = 'block';
    } else {
        container.className = 'preview-a4 bg-white relative text-black mx-auto print:mx-0 print:w-full print:shadow-none print:p-0';
        document.body.className = 'print-a4';
        if (a4View) a4View.style.display = 'block';
        if (thermalView) thermalView.style.display = 'none';
    }

    // Force scale & height recalculation after DOM reflow
    setTimeout(() => {
        setPrintScale(window.currentScaleMode || '100%');
    }, 50);
}

function setPrintScale(scaleMode) {
    // Remember the chosen scale mode for when layouts are toggled
    scaleMode = scaleMode || window.currentScaleMode || '100%';
    window.currentScaleMode = scaleMode;

    const wrapper = document.getElementById('print-scale-wrapper');
    const content = document.getElementById('print-content');
    if (!wrapper || !content) return;

    wrapper.style.height = 'auto';
    content.style.height = 'auto';
    content.style.overflow = 'visible';

    const isThermal = document.body.classList.contains('print-thermal');
    const baseWidth = isThermal ? 302 : 794;
    // Allow thermal to stretch as long as it needs
    const baseHeight = Math.max(isThermal ? 400 : 1123, content.offsetHeight);

    const availableWidth = window.innerWidth - 32;
    const availableHeight = window.innerHeight - 100;

    let newScale = 1;

    if (scaleMode === '100%' || scaleMode === 'fit-page') {
        const scaleW = availableWidth / baseWidth;
        const scaleH = availableHeight / baseHeight;
        // If it's thermal, we rarely want to 'fit-page' height because receipts are very long
        newScale = isThermal ? scaleW : Math.min(scaleW, scaleH);
    } else if (scaleMode === 'fit-width') {
        newScale = availableWidth / baseWidth;
    }

    newScale = Math.min(newScale, 2);
    wrapper.style.setProperty('--print-scale', newScale.toFixed(3));

    wrapper.style.height = (baseHeight * newScale) + 'px';
    wrapper.style.transformOrigin = 'top center';
}

function openPrintPreview(type, data) {
    const view = document.getElementById('print-view');
    const content = document.getElementById('print-content');
    if (!view || !content) return;

    // Ensure Modals are closed so they don't bleed into the physical print
    if (window.closeAllModals) window.closeAllModals();

    view.classList.remove('bg-white', 'text-black');
    view.classList.add('bg-slate-100', 'dark:bg-slate-950');

    let html = '';
    const client = appDB.clients.find(c => c.clientId === data.clientId) || { printName: 'Unknown Client', address: '', gstin: '' };

    if (type === 'INVOICE' || type === 'QUOTATION') {
        const isInv = (type === 'INVOICE');
        // If it's a Quote, isTaxable is ALWAYS false. If it's an Invoice, check its specific state.
        const isTaxable = isInv && data.isTaxable !== false;
        const docLabel = isInv ? (isTaxable ? 'TAX INVOICE' : 'MEMO') : 'ESTIMATE / QUOTATION';

        const groups = [];
        const groupIndex = {};
        data.lineItems.forEach(it => {
            const key = `${it.date || ''}__${it.vehicle || ''}`;
            if (groupIndex[key] === undefined) {
                groupIndex[key] = groups.length;
                groups.push({ date: it.date || '', vehicle: it.vehicle || '', items: [], total: 0 });
            }
            groups[groupIndex[key]].items.push(it);
            groups[groupIndex[key]].total += it.cost;
        });

        // ==========================================
        // 1. GENERATE A4 LAYOUT
        // ==========================================
        let a4ItemRowsHtml = '';
        groups.forEach(g => {
            const workLines = g.items.map(it => `<div>${it.workDone}</div>`).join('');
            const costLines = g.items.map(it => `<div>${it.cost.toFixed(2)}</div>`).join('');

            a4ItemRowsHtml += `
            <tr style="border-bottom: 1px dashed black;">
                <td class="p-2 align-top whitespace-nowrap" style="border-right: 1px solid black;">${formatDate(g.date)}</td>
                <td class="p-2 align-top font-bold uppercase" style="border-right: 1px solid black;">${g.vehicle}</td>
                <td class="p-2 align-top uppercase" style="border-right: 1px solid black;">${workLines}</td>
                <td class="p-2 align-top text-right" style="border-right: 1px solid black;">${costLines}</td>
                <td class="p-2 align-top text-right font-bold">${g.total.toFixed(2)}</td>
            </tr>`;
        });

        const taxRowsHtml = isTaxable ? `
            <tr>
                <td colspan="4" class="p-1.5 text-right font-bold text-[11px]" style="border-right: 1px solid black; color: black !important;">TAXABLE VALUE</td>
                <td class="p-1.5 text-right font-bold" style="color: black !important;">${data.taxable.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="4" class="p-1 text-right text-[10px] font-bold" style="border-right: 1px solid black; color: black !important;">ADD GST: CGST 9%</td>
                <td class="p-1 text-right text-[10px] font-bold" style="color: black !important;">${data.cgst.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="4" class="p-1 text-right text-[10px] font-bold" style="border-right: 1px solid black; color: black !important;">SGST 9%</td>
                <td class="p-1 text-right text-[10px] font-bold" style="color: black !important;">${data.sgst.toFixed(2)}</td>
            </tr>` : `
            <tr>
                <td colspan="4" class="p-1.5 text-right font-bold text-[11px]" style="border-right: 1px solid black; color: black !important;">TAXABLE VALUE / TOTAL</td>
                <td class="p-1.5 text-right font-bold" style="color: black !important;">${data.taxable.toFixed(2)}</td>
            </tr>`;

        const a4Html = `
        <div class="text-black font-sans w-full" style="box-sizing: border-box; overflow: visible;">
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center justify-start w-1/4">
                    <img src="assets/logo.png" alt="MBB Logo" class="w-20 h-20 object-contain filter-primary-blue" style="filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;">
                </div>
                <div class="text-center w-2/4">
                    <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 46px; color: #0033cc !important; line-height: 1; font-weight: normal; margin-bottom: 2px;">${COMPANY_DETAILS.name}</h1>
                </div>
                <div class="text-right text-[11px] font-bold w-1/4" style="color: black !important;">
                    <p>${COMPANY_DETAILS.phone1}</p>
                    <p>${COMPANY_DETAILS.phone2}</p>
                </div>
            </div>
            <div class="text-center text-[10px] font-bold mb-2 flex justify-center gap-2" style="color: black !important;">
                <span>${COMPANY_DETAILS.tagline}</span>
                ${isTaxable ? `<span>GSTIN: ${COMPANY_DETAILS.gstin}</span>` : ''}
            </div>
            <div class="border-y border-black text-center py-1.5 text-[11px] font-medium mb-6" style="color: black !important;">
                Address : ${COMPANY_DETAILS.address}
            </div>
            <div class="flex justify-between items-start mb-6 text-[12px]" style="color: black !important;">
                <div class="w-1/2 flex gap-2">
                    <span class="font-bold">To,</span>
                    <div>
                        <h2 class="font-bold text-base uppercase leading-none mb-1.5">${client.printName}</h2>
                        <p class="whitespace-pre-wrap leading-tight mb-2">${client.address || ''}</p>
                        ${isTaxable && client.gstin ? `<div class="mt-2"><span class="font-bold">GSTIN:</span> <span class="font-bold uppercase">${client.gstin}</span></div>` : ''}
                    </div>
                </div>
                <div class="w-1/3 flex flex-col items-end text-right">
                    <h2 class="font-bold text-lg uppercase tracking-widest border-b-[1.5px] border-black pb-0.5 mb-2 inline-block">${docLabel}</h2>
                    <table class="text-[12px]">
                        <tr><td class="pr-2 text-right">Invoice No.:</td><td class="font-bold text-left">${data.docNumber}</td></tr>
                        <tr><td class="pr-2 text-right">Date:</td><td class="font-bold text-left">${formatDate(data.date)}</td></tr>
                    </table>
                </div>
            </div>
            <table class="w-full text-[12px] border border-black" style="border-collapse: collapse; color: black !important;">
                <thead>
                    <tr class="font-bold text-left border-b border-black">
                        <th class="p-2 w-[15%]" style="border-right: 1px solid black;">Date</th>
                        <th class="p-2 w-[20%]" style="border-right: 1px solid black;">Vehicle No.</th>
                        <th class="p-2 w-[40%]" style="border-right: 1px solid black;">Work</th>
                        <th class="p-2 w-[12%] text-right" style="border-right: 1px solid black;">Cost</th>
                        <th class="p-2 w-[13%] text-right">Amount</th>
                    </tr>
                </thead>
                <tbody class="align-top border-b border-black">
                    ${a4ItemRowsHtml}
                    <tr>
                        <td class="h-24" style="border-right: 1px solid black;"></td>
                        <td style="border-right: 1px solid black;"></td>
                        <td style="border-right: 1px solid black;"></td>
                        <td style="border-right: 1px solid black;"></td>
                        <td></td>
                    </tr>
                </tbody>
                <tfoot>
                    ${taxRowsHtml}
                    <tr class="border-t border-black">
                        <td colspan="4" class="p-2 text-right font-bold" style="border-right: 1px solid black;">TOTAL</td>
                        <td class="p-2 text-right font-black text-[13px]">₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="border border-black border-t-0 p-2 text-[11px] font-bold uppercase ${!isInv ? 'mb-4' : 'mb-24'}" style="color: black !important;">
                ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
            </div>

            ${!isInv ? `
            <div class="text-[11px] font-bold text-left mb-16 italic" style="color: black !important;">
                ${COMPANY_DETAILS.quoteDisclaimers.map(d => `<p>${d}</p>`).join('')}
            </div>
            ` : ''}

            <div class="flex justify-between items-end text-[12px] font-bold px-2" style="color: black !important;">
                <div>Receivers Signature</div>
                <div class="text-center">
                    <p class="mb-12">For ${COMPANY_DETAILS.name}</p>
                    <p>Authorised Signature</p>
                </div>
            </div>
        </div>`;


        // ==========================================
        // 2. GENERATE THERMAL LAYOUT
        // ==========================================
        let thermalItemsHtml = '';
        groups.forEach(g => {
            thermalItemsHtml += `
            <div class="mb-2 pb-2 border-b border-dashed border-gray-400">
                <div class="font-bold text-[12px]">${formatDate(g.date)}</div>
                <div class="font-bold text-[12px] uppercase mb-1">${g.vehicle}</div>
                <table class="w-full text-[11px]">
            `;
            g.items.forEach(it => {
                thermalItemsHtml += `<tr><td class="pb-1 pr-2 align-top">${it.workDone}</td><td class="pb-1 text-right align-top font-bold w-16">₹${it.cost.toFixed(2)}</td></tr>`;
            });
            thermalItemsHtml += `
                </table>
                <div class="text-right font-black text-[12px] pt-1">Subtotal: ₹${g.total.toFixed(2)}</div>
            </div>`;
        });

        const thermalHtml = `
        <div class="font-sans text-black w-full" style="box-sizing: border-box;">
            <div class="text-center mb-3">
                <img src="assets/logo.png" alt="MBB Logo" class="w-16 h-16 mx-auto mb-1 filter-primary-blue" style="filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;">
                <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 28px; color: #0033cc !important; line-height: 1; margin-bottom: 4px;">${COMPANY_DETAILS.name}</h1>
                <p class="text-[11px] font-bold">${COMPANY_DETAILS.phone1} | ${COMPANY_DETAILS.phone2}</p>
                <p class="text-[10px]">${COMPANY_DETAILS.address}</p>
                ${isTaxable ? `<p class="text-[10px] font-bold mt-1">GSTIN: ${COMPANY_DETAILS.gstin}</p>` : ''}
            </div>

            <div class="border-y border-dashed border-black py-2 mb-3 text-[11px]">
                <div class="text-center font-bold text-[13px] uppercase tracking-wider mb-2">${docLabel}</div>
                <p><span class="font-bold">To:</span> ${client.printName}</p>
                ${isTaxable && client.gstin ? `<p><span class="font-bold">GSTIN:</span> <span class="uppercase">${client.gstin}</span></p>` : ''}
                <div class="flex justify-between mt-1">
                    <p><span class="font-bold">No:</span> ${data.docNumber}</p>
                    <p><span class="font-bold">Date:</span> ${formatDate(data.date)}</p>
                </div>
            </div>

            <div class="mb-2">
                ${thermalItemsHtml}
            </div>

            <div class="border-t-[1.5px] border-black pt-2 text-[11px]">
                ${isTaxable ? `
                <div class="flex justify-between mb-0.5"><span>Taxable:</span><span>₹${data.taxable.toFixed(2)}</span></div>
                <div class="flex justify-between mb-0.5"><span>CGST 9%:</span><span>₹${data.cgst.toFixed(2)}</span></div>
                <div class="flex justify-between mb-1"><span>SGST 9%:</span><span>₹${data.sgst.toFixed(2)}</span></div>
                ` : ''}
                <div class="flex justify-between font-black text-[14px] mt-1 border-t border-black pt-1 mb-2">
                    <span>TOTAL:</span><span>₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}</span>
                </div>
                <div class="font-bold text-[11px] uppercase text-center border-b border-dashed border-black pb-2 mb-3">
                    ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
                </div>
            </div>

            ${!isInv ? `
            <div class="text-[10px] text-center font-bold mb-3 italic">
                ${COMPANY_DETAILS.quoteDisclaimers.map(d => `<p>${d}</p>`).join('')}
            </div>
            ` : ''}

            <div class="text-center text-[11px] font-bold mb-6">
                <p>For ${COMPANY_DETAILS.name}</p>
                <p class="mt-8">(Authorised Signatory)</p>
                <p class="mt-3 border-b-2 border-black pb-4 text-[10px] tracking-widest uppercase">*** Customer Copy ***</p>
            </div>

            ${isInv ? `
            <div class="text-[11px] pt-2 pb-6">
                <div class="text-center font-bold mb-3 tracking-widest uppercase">*** Office Copy ***</div>
                <p><span class="font-bold">Inv No:</span> ${data.docNumber}</p>
                <p><span class="font-bold">Date:</span> ${formatDate(data.date)}</p>
                <p><span class="font-bold">Client:</span> ${client.printName}</p>
                
                <div class="mt-3 border-t-[1.5px] border-black pt-2 text-[11px]">
                    ${isTaxable ? `
                    <div class="flex justify-between mb-0.5"><span>Taxable:</span><span>₹${data.taxable.toFixed(2)}</span></div>
                    <div class="flex justify-between mb-0.5"><span>CGST 9%:</span><span>₹${data.cgst.toFixed(2)}</span></div>
                    <div class="flex justify-between mb-1"><span>SGST 9%:</span><span>₹${data.sgst.toFixed(2)}</span></div>
                    ` : ''}
                    <div class="flex justify-between font-black text-[14px] mt-1 border-y border-black py-1 mb-2">
                        <span>TOTAL:</span><span>₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                    <div class="font-bold text-[11px] uppercase text-center">
                        ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
                    </div>
                </div>

                <div class="mt-12 flex justify-between items-end font-bold px-2">
                    <span>Receiver's Sign</span>
                    <span>___________</span>
                </div>
            </div>
            ` : ''}
        </div>`;

        // Wrap them so setPrintLayout can toggle them
        html = `
            <div class="a4-layout-container">${a4Html}</div>
            <div class="thermal-layout-container hidden" style="display: none;">${thermalHtml}</div>
        `;

    } else if (type === 'STATEMENT') {
        const statementHtml = `
        <div class="text-black font-sans w-full" style="box-sizing: border-box; overflow: visible;">
            <div class="flex flex-col items-center mb-4">
                <img src="assets/logo.png" alt="Mangala Logo" class="w-16 h-16 object-contain mb-2 filter-primary-blue" style="filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;">
                <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 38px; color: #0033cc !important; line-height: 1;">${COMPANY_DETAILS.name}</h1>
            </div>
            <p class="text-center font-bold text-sm mb-6 uppercase tracking-widest border-y border-black py-1" style="color: black !important;">Client Ledger Statement</p>
            
            <div class="mb-8 flex justify-between items-end border-b border-dashed border-gray-400 pb-4" style="color: black !important;">
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase">Statement For:</label>
                    <p class="text-xl font-black">${client.printName}</p>
                    <p class="text-sm font-bold text-gray-700 mt-1">Period: ${data.from} to ${data.to}</p>
                </div>
                <div class="text-right text-sm">
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    <p class="font-bold text-lg mt-1">Status: <span class="${data.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}">Balance ₹ ${data.balance.toLocaleString('en-IN')}</span></p>
                </div>
            </div>
            
            <table class="w-full text-xs text-left border border-black" style="border-collapse: collapse; color: black !important;">
                <thead>
                    <tr class="border-b border-black font-bold uppercase">
                        <th class="p-2" style="border-right: 1px solid black;">Date</th>
                        <th class="p-2" style="border-right: 1px solid black;">Particulars / Description</th>
                        <th class="p-2 text-right" style="border-right: 1px solid black;">Debit (₹)</th>
                        <th class="p-2 text-right" style="border-right: 1px solid black;">Credit (₹)</th>
                        <th class="p-2 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.rows.map(r => `
                    <tr style="border-bottom: 1px dashed black;" class="${r.type === 'TOTAL' ? 'font-black bg-gray-50' : ''}">
                        <td class="p-2" style="border-right: 1px solid black;">${r.date}</td>
                        <td class="p-2" style="border-right: 1px solid black;">
                           <div class="font-bold">${r.label}</div>
                           <div class="text-[9px] text-gray-600">${r.ref || ''}</div>
                        </td>
                        <td class="p-2 text-right" style="border-right: 1px solid black;">${r.dr ? r.dr.toLocaleString('en-IN') : ''}</td>
                        <td class="p-2 text-right" style="border-right: 1px solid black;">${r.cr ? r.cr.toLocaleString('en-IN') : ''}</td>
                        <td class="p-2 text-right font-bold">${r.bal.toLocaleString('en-IN')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="mt-12 text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">--- END OF STATEMENT ---</div>
        </div>`;

        html = `
            <div class="a4-layout-container">${statementHtml}</div>
            <div class="thermal-layout-container hidden" style="display: none;">
               <p class="text-center font-bold text-xl mt-10">Statements are designed for A4 layout only.</p>
            </div>
        `;
    }

    content.innerHTML = html;

    // Reset to A4 by default when opening
    setPrintLayout('a4');
    view.classList.add('active');
    document.getElementById('app-container').classList.add('hidden');

    setTimeout(() => {
        setPrintScale('100%');
    }, 50);
}

// Global exports
window.reprintDoc = reprintDoc;
window.printStatement = printStatement;
window.closePrintView = closePrintView;
window.setPrintLayout = setPrintLayout;
window.setPrintScale = setPrintScale;
window.openPrintPreview = openPrintPreview;