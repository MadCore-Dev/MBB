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
    if (window.printPayload && window.printPayload.type === 'STATEMENT') {
        openPrintPreview('STATEMENT', window.printPayload);
    } else {
        window.print();
    }
}

function closePrintView() {
    document.getElementById('print-view').classList.remove('active');
    document.getElementById('app-container').classList.remove('hidden');
    document.body.classList.remove('print-a4', 'print-thermal');
}

function setPrintLayout(mode) {
    const container = document.getElementById('print-content');
    if (!container) return;

    container.style.overflow = 'visible';
    container.style.height = 'auto';

    const a4View = container.querySelector('.a4-layout-container');
    const thermalView = container.querySelector('.thermal-layout-container');

    if (mode === 'thermal') {
        container.className = 'preview-thermal bg-white relative text-black mx-auto print:mx-0 print:w-full print:shadow-none';
        document.body.classList.remove('print-a4');
        document.body.classList.add('print-thermal');
        if (a4View) a4View.style.display = 'none';
        if (thermalView) thermalView.style.display = 'block';
    } else {
        container.className = 'relative text-black mx-auto print:mx-0 w-full print:shadow-none bg-transparent';
        document.body.classList.remove('print-thermal');
        document.body.classList.add('print-a4');
        if (a4View) a4View.style.display = 'block';
        if (thermalView) thermalView.style.display = 'none';
    }

    setTimeout(() => {
        setPrintScale(window.currentScaleMode || '100%');
    }, 50);
}

function setPrintScale(scaleMode) {
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
    const baseHeight = Math.max(isThermal ? 400 : 1123, content.offsetHeight);

    const availableWidth = window.innerWidth - 32;
    const availableHeight = window.innerHeight - 100;

    let newScale = 1;

    if (scaleMode === '100%' || scaleMode === 'fit-page') {
        const scaleW = availableWidth / baseWidth;
        const scaleH = availableHeight / baseHeight;
        newScale = isThermal ? scaleW : Math.min(scaleW, scaleH);
    } else if (scaleMode === 'fit-width') {
        newScale = availableWidth / baseWidth;
    }

    newScale = Math.min(newScale, 2);
    wrapper.style.setProperty('--print-scale', newScale.toFixed(3));
    wrapper.style.height = (baseHeight * newScale) + 'px';
    wrapper.style.transformOrigin = 'top center';

    updatePageHeightDebugger();
}

function openPrintPreview(type, data) {
    const view = document.getElementById('print-view');
    const content = document.getElementById('print-content');
    if (!view || !content) return;

    if (window.closeAllModals) window.closeAllModals();

    view.classList.add('active');
    document.getElementById('app-container').classList.add('hidden');

    const wrapper = document.getElementById('print-scale-wrapper');
    if (wrapper) {
        wrapper.style.transform = 'scale(1)';
        wrapper.style.height = 'auto';
    }
    content.style.height = 'auto';

    setPrintLayout('a4');
    content.innerHTML = '';

    const client = appDB.clients.find(c => c.clientId === data.clientId) || { printName: 'Unknown Client', address: '', gstin: '' };

    if (type === 'INVOICE' || type === 'QUOTATION') {
        const isInv = (type === 'INVOICE');
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

        const a4Container = document.createElement('div');
        a4Container.className = 'a4-layout-container flex flex-col gap-8 print:gap-0 w-full items-center bg-transparent';
        content.appendChild(a4Container);

        let allRows = [];
        groups.forEach(g => {
            g.items.forEach((it, idx) => {
                allRows.push({
                    date: idx === 0 ? formatDate(g.date) : '',
                    vehicle: idx === 0 ? g.vehicle : '',
                    workDone: it.workDone,
                    cost: it.cost.toFixed(2),
                    amount: idx === 0 ? g.total.toFixed(2) : ''
                });
            });
        });

        let pageIndex = 0;
        let currentPage = null;
        let currentTbody = null;
        let pages = [];

        const taxRowsHtml = isTaxable ? `
            <table class="w-full text-[12px] border-x border-b border-black" style="table-layout: fixed; border-collapse: collapse; margin-top: -1px; color: black !important;">
                <colgroup><col style="width: 15%;"><col style="width: 20%;"><col style="width: 40%;"><col style="width: 12%;"><col style="width: 13%;"></colgroup>
                <tbody>
                    <tr><td colspan="4" class="p-1.5 text-right font-bold text-[11px] border-r border-black" style="color: black !important;">TAXABLE VALUE</td><td class="p-1.5 text-right font-bold" style="color: black !important;">${data.taxable.toFixed(2)}</td></tr>
                    <tr><td colspan="4" class="p-1 text-right text-[10px] font-bold border-r border-black" style="color: black !important;">ADD GST: CGST 9%</td><td class="p-1 text-right text-[10px] font-bold" style="color: black !important;">${data.cgst.toFixed(2)}</td></tr>
                    <tr><td colspan="4" class="p-1 text-right text-[10px] font-bold border-r border-black" style="color: black !important;">SGST 9%</td><td class="p-1 text-right text-[10px] font-bold" style="color: black !important;">${data.sgst.toFixed(2)}</td></tr>
                    <tr class="border-t border-black"><td colspan="4" class="p-2 text-right font-bold border-r border-black">TOTAL</td><td class="p-2 text-right font-black text-[13px]">₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}</td></tr>
                </tbody>
            </table>
        ` : `
            <table class="w-full text-[12px] border-x border-b border-black" style="table-layout: fixed; border-collapse: collapse; margin-top: -1px; color: black !important;">
                <colgroup><col style="width: 15%;"><col style="width: 20%;"><col style="width: 40%;"><col style="width: 12%;"><col style="width: 13%;"></colgroup>
                <tbody>
                    <tr><td colspan="4" class="p-1.5 text-right font-bold text-[11px] border-r border-black" style="color: black !important;">TAXABLE VALUE / TOTAL</td><td class="p-1.5 text-right font-bold" style="color: black !important;">${data.taxable.toFixed(2)}</td></tr>
                    <tr class="border-t border-black"><td colspan="4" class="p-2 text-right font-bold border-r border-black">TOTAL</td><td class="p-2 text-right font-black text-[13px]">₹ ${Math.round(data.grandTotal).toLocaleString('en-IN')}</td></tr>
                </tbody>
            </table>
        `;

        const finalSignaturesHtml = `
            ${taxRowsHtml}
            <div class="border border-black border-t-0 p-2 text-[11px] font-bold uppercase ${!isInv ? 'mb-4' : 'mb-20'}" style="color: black !important;">
                ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
            </div>
            ${!isInv ? `<div class="text-[11px] font-bold text-left mb-16 italic" style="color: black !important;">${COMPANY_DETAILS.quoteDisclaimers.map(d => `<p>${d}</p>`).join('')}</div>` : ''}
            <div class="flex justify-between items-end text-[12px] font-bold px-2 mt-auto" style="color: black !important;">
                <div>Receivers Signature</div>
                <div class="text-center"><p class="mb-12">For ${COMPANY_DETAILS.name}</p><p>Authorised Signature</p></div>
            </div>
        `;

        const contSignaturesHtml = `
            <div class="text-center text-[10px] italic text-gray-500 mt-2 pb-2">
                Continued on next page...
            </div>
        `;

        function createNewPage() {
            const isFirst = pageIndex === 0;
            const pageDiv = document.createElement('div');
            pageDiv.className = 'preview-a4 bg-white relative text-black print:p-0 print:m-0 print:shadow-none print:break-inside-avoid flex flex-col mx-auto';
            pageDiv.style.boxSizing = 'border-box';
            pageDiv.style.overflow = 'hidden';
            pageDiv.style.minHeight = 'auto'; // Shrink-wrap mode for true pixel measurement

            const headerHtml = isFirst ? `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center justify-start w-1/4">
                        <img src="assets/logo.png" alt="MBB Logo" class="w-20 h-20 object-contain filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
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
            ` : `
                <div class="flex justify-between items-end border-b-[1.5px] border-black pb-2 mb-4" style="color: black !important;">
                    <div class="flex items-center gap-2">
                        <img src="assets/logo.png" alt="MBB Logo" class="h-8 w-8 object-contain filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
                        <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 26px; color: #0033cc !important; line-height: 1; margin-bottom: 0;">${COMPANY_DETAILS.name}</h1>
                    </div>
                    <div class="text-right text-[10px] font-bold uppercase pb-1 mini-header-cont"></div>
                </div>
            `;

            const clientHtml = `
            <div class="flex justify-between items-start mb-4 text-[12px]" style="color: black !important;">
                <div class="w-1/2 flex gap-2">
                    <span class="font-bold">To,</span>
                    <div>
                        <h2 class="font-bold text-base uppercase leading-none mb-1.5">${client.printName}</h2>
                        ${isFirst ? `<p class="whitespace-pre-wrap leading-tight mb-2">${client.address || ''}</p>` : ''}
                        ${isTaxable && client.gstin ? `<div class="${isFirst ? 'mt-2' : ''}"><span class="font-bold">GSTIN:</span> <span class="font-bold uppercase">${client.gstin}</span></div>` : ''}
                    </div>
                </div>
                <div class="w-1/3 flex flex-col items-end text-right">
                    ${isFirst ? `<h2 class="font-bold text-lg uppercase tracking-widest border-b-[1.5px] border-black pb-0.5 mb-2 inline-block">${docLabel}</h2>` : ''}
                    <table class="text-[12px]">
                        <tr><td class="pr-2 text-right">No.:</td><td class="font-bold text-left">${data.docNumber}</td></tr>
                        <tr><td class="pr-2 text-right">Date:</td><td class="font-bold text-left">${formatDate(data.date)}</td></tr>
                    </table>
                </div>
            </div>`;

            // FIX: Added 'main-tbody' class to explicitly target this table instead of the client header table
            pageDiv.innerHTML = `
                ${headerHtml}
                ${clientHtml}
                <table class="w-full text-[12px] border border-black" style="table-layout: fixed; border-collapse: collapse; color: black !important; background: transparent;">
                    <colgroup>
                        <col style="width: 15%;">
                        <col style="width: 20%;">
                        <col style="width: 40%;">
                        <col style="width: 12%;">
                        <col style="width: 13%;">
                    </colgroup>
                    <tbody class="align-top border-b border-black main-tbody">
                        <tr class="font-bold text-left border-b border-black bg-gray-50 print:bg-white">
                            <th class="p-2 border-r border-black">Date</th>
                            <th class="p-2 border-r border-black">Vehicle No.</th>
                            <th class="p-2 border-r border-black">Work</th>
                            <th class="p-2 border-r border-black text-right">Cost</th>
                            <th class="p-2 text-right">Amount</th>
                        </tr>
                    </tbody>
                </table>
                <div class="flex-grow flex border-x border-b border-black text-[12px] box-border bg-white" style="margin-top: -1px;">
                    <div style="width: 15%;" class="border-r border-black"></div>
                    <div style="width: 20%;" class="border-r border-black"></div>
                    <div style="width: 40%;" class="border-r border-black"></div>
                    <div style="width: 12%;" class="border-r border-black"></div>
                    <div style="width: 13%;"></div>
                </div>
                <div class="page-signatures flex flex-col justify-end mt-0"></div>
                <div class="absolute bottom-2 right-4 text-[9px] font-bold text-gray-400 no-print page-number-stamp"></div>
            `;

            a4Container.appendChild(pageDiv);
            currentPage = pageDiv;
            currentTbody = pageDiv.querySelector('.main-tbody'); // Strict targeting
            pages.push(pageDiv);
            pageIndex++;
        }

        createNewPage();

        allRows.forEach((r, i) => {
            const isLastRow = (i === allRows.length - 1);

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px dashed black';
            tr.innerHTML = `
                <td class="p-2 align-top break-words border-r border-black">${r.date}</td>
                <td class="p-2 align-top font-bold uppercase break-words border-r border-black">${r.vehicle}</td>
                <td class="p-2 align-top uppercase break-words whitespace-pre-wrap border-r border-black">${r.workDone}</td>
                <td class="p-2 align-top text-right break-words border-r border-black">${r.cost}</td>
                <td class="p-2 align-top text-right font-bold break-words">${r.amount}</td>
            `;

            currentTbody.appendChild(tr);

            const miniHeaderCont = currentPage.querySelector('.mini-header-cont');
            if (miniHeaderCont) miniHeaderCont.innerText = `${docLabel} (Cont.) | Page 99 of 99`;

            const sigs = currentPage.querySelector('.page-signatures');
            sigs.innerHTML = isLastRow ? finalSignaturesHtml : contSignaturesHtml;

            // Height Check - Ensure we don't accidentally rip out the Header row (which is index 0)
            if (currentPage.offsetHeight > 1120 && currentTbody.children.length > 2) {
                // Overflow detected! Pull row back.
                currentTbody.removeChild(tr);
                sigs.innerHTML = contSignaturesHtml;
                currentPage.style.minHeight = '297mm'; // Seal and stretch this page's flex spacer

                // Spin up next page
                createNewPage();
                currentTbody.appendChild(tr);
                currentPage.querySelector('.page-signatures').innerHTML = isLastRow ? finalSignaturesHtml : contSignaturesHtml;
            }
        });

        // Seal the final page
        currentPage.style.minHeight = '297mm';

        pages.forEach((p, idx) => {
            p.querySelector('.page-number-stamp').innerText = `Page ${idx + 1} of ${pages.length}`;
            const miniHeaderCont = p.querySelector('.mini-header-cont');
            if (miniHeaderCont) {
                miniHeaderCont.innerText = `${docLabel} (Cont.) | Page ${idx + 1} of ${pages.length}`;
            }
        });

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
                <img src="assets/logo.png" alt="MBB Logo" class="w-16 h-16 mx-auto mb-1 filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
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
            ${!isInv ? `<div class="text-[10px] text-center font-bold mb-3 italic">${COMPANY_DETAILS.quoteDisclaimers.map(d => `<p>${d}</p>`).join('')}</div>` : ''}
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

        const thermalContainer = document.createElement('div');
        thermalContainer.className = 'thermal-layout-container hidden';
        thermalContainer.style.display = 'none';
        thermalContainer.innerHTML = thermalHtml;
        content.appendChild(thermalContainer);

    } else if (type === 'STATEMENT') {

        // ==========================================
        // 1. A4 LAYOUT FOR STATEMENTS (GHOST RENDERING)
        // ==========================================
        const a4Container = document.createElement('div');
        a4Container.className = 'a4-layout-container flex flex-col gap-8 print:gap-0 w-full items-center bg-transparent';
        content.appendChild(a4Container);

        let pageIndex = 0;
        let currentPage = null;
        let currentTbody = null;
        let pages = [];

        const stmtFooterHtml = `
            <div class="mt-4 text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest mb-4">
                --- END OF STATEMENT ---
            </div>
        `;

        const stmtContHtml = `
            <div class="text-center text-[10px] italic text-gray-500 mt-2 mb-4">
                Continued on next page...
            </div>
        `;

        function createNewPage() {
            const isFirst = pageIndex === 0;
            const pageDiv = document.createElement('div');
            pageDiv.className = 'preview-a4 bg-white relative text-black print:p-0 print:m-0 print:shadow-none print:break-inside-avoid flex flex-col mx-auto';
            pageDiv.style.boxSizing = 'border-box';
            pageDiv.style.overflow = 'hidden';
            pageDiv.style.minHeight = 'auto';

            const headerHtml = isFirst ? `
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center justify-start w-1/4">
                        <img src="assets/logo.png" alt="MBB Logo" class="w-20 h-20 object-contain filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
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
                </div>
                <div class="border-y border-black text-center py-1.5 text-[11px] font-medium mb-6" style="color: black !important;">
                    Address : ${COMPANY_DETAILS.address}
                </div>
            ` : `
                <div class="flex justify-between items-end border-b-[1.5px] border-black pb-2 mb-4" style="color: black !important;">
                    <div class="flex items-center gap-2">
                        <img src="assets/logo.png" alt="MBB Logo" class="h-8 w-8 object-contain filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
                        <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 26px; color: #0033cc !important; line-height: 1; margin-bottom: 0;">${COMPANY_DETAILS.name}</h1>
                    </div>
                    <div class="text-right text-[10px] font-bold uppercase pb-1 mini-header-cont"></div>
                </div>
            `;

            const clientHtml = isFirst ? `
                <p class="text-center font-bold text-sm mb-6 uppercase tracking-widest border-y border-black py-1" style="color: black !important;">Client Ledger Statement</p>
                <div class="mb-6 flex justify-between items-end border-b border-dashed border-gray-400 pb-4" style="color: black !important;">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500 uppercase">Statement For:</label>
                        <p class="text-xl font-black uppercase">${client.printName}</p>
                        <p class="text-sm font-bold text-gray-700 mt-1">Period: ${data.from} to ${data.to}</p>
                    </div>
                    <div class="text-right text-sm">
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                        <p class="font-bold text-lg mt-1">Status: <span class="${data.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}">Balance ₹ ${data.balance.toLocaleString('en-IN')}</span></p>
                    </div>
                </div>
            ` : '';

            // FIX: Added 'main-tbody' to isolate targeting
            pageDiv.innerHTML = `
                ${headerHtml}
                ${clientHtml}
                <table class="w-full text-xs text-left border border-black bg-transparent" style="table-layout: fixed; border-collapse: collapse; color: black !important;">
                    <colgroup>
                        <col style="width: 15%;">
                        <col style="width: 40%;">
                        <col style="width: 15%;">
                        <col style="width: 15%;">
                        <col style="width: 15%;">
                    </colgroup>
                    <tbody class="align-top border-b border-black main-tbody">
                        <tr class="border-b border-black font-bold uppercase bg-gray-50 print:bg-white">
                            <th class="p-2 border-r border-black">Date</th>
                            <th class="p-2 border-r border-black">Particulars / Description</th>
                            <th class="p-2 border-r border-black text-right">Debit (₹)</th>
                            <th class="p-2 border-r border-black text-right">Credit (₹)</th>
                            <th class="p-2 text-right">Balance</th>
                        </tr>
                    </tbody>
                </table>
                <div class="flex-grow flex border-x border-b border-black text-xs box-border bg-white" style="margin-top: -1px;">
                    <div style="width: 15%;" class="border-r border-black"></div>
                    <div style="width: 40%;" class="border-r border-black"></div>
                    <div style="width: 15%;" class="border-r border-black"></div>
                    <div style="width: 15%;" class="border-r border-black"></div>
                    <div style="width: 15%;"></div>
                </div>
                <div class="page-signatures flex flex-col justify-end mt-0"></div>
                <div class="absolute bottom-2 right-4 text-[9px] font-bold text-gray-400 no-print page-number-stamp"></div>
            `;

            a4Container.appendChild(pageDiv);
            currentPage = pageDiv;
            currentTbody = pageDiv.querySelector('.main-tbody'); // Strict Targeting
            pages.push(pageDiv);
            pageIndex++;
        }

        createNewPage();

        data.rows.forEach((r, i) => {
            const isLastRow = (i === data.rows.length - 1);

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px dashed black';
            if (r.isBf) tr.className = 'bg-gray-50';

            tr.innerHTML = `
                <td class="p-2 align-top break-words border-r border-black ${r.isBf ? 'italic' : ''}">${formatDate(r.date)}</td>
                <td class="p-2 align-top break-words border-r border-black">
                   <div class="font-bold ${r.isBf ? 'text-gray-600' : ''}">${r.label}</div>
                   <div class="text-[9px] text-gray-600">${r.ref || ''}</div>
                </td>
                <td class="p-2 align-top text-right break-words border-r border-black">${r.dr ? r.dr.toLocaleString('en-IN') : ''}</td>
                <td class="p-2 align-top text-right break-words border-r border-black">${r.cr ? r.cr.toLocaleString('en-IN') : ''}</td>
                <td class="p-2 align-top text-right font-bold break-words">${r.bal.toLocaleString('en-IN')}</td>
            `;

            currentTbody.appendChild(tr);

            const miniHeaderCont = currentPage.querySelector('.mini-header-cont');
            if (miniHeaderCont) miniHeaderCont.innerText = `LEDGER STATEMENT (Cont.) | Page 99 of 99`;

            const sigs = currentPage.querySelector('.page-signatures');
            sigs.innerHTML = isLastRow ? stmtFooterHtml : stmtContHtml;

            if (currentPage.offsetHeight > 1120 && currentTbody.children.length > 2) {
                currentTbody.removeChild(tr);
                sigs.innerHTML = stmtContHtml;
                currentPage.style.minHeight = '297mm';

                createNewPage();
                currentTbody.appendChild(tr);
                currentPage.querySelector('.page-signatures').innerHTML = isLastRow ? stmtFooterHtml : stmtContHtml;
            }
        });

        currentPage.style.minHeight = '297mm';

        pages.forEach((p, idx) => {
            p.querySelector('.page-number-stamp').innerText = `Page ${idx + 1} of ${pages.length}`;
            const miniHeaderCont = p.querySelector('.mini-header-cont');
            if (miniHeaderCont) {
                miniHeaderCont.innerText = `LEDGER STATEMENT (Cont.) | Page ${idx + 1} of ${pages.length}`;
            }
        });

        // ==========================================
        // 2. THERMAL LAYOUT FOR STATEMENTS
        // ==========================================
        let thermalRowsHtml = '';
        data.rows.forEach(r => {
            const drStr = r.dr ? '₹' + r.dr.toLocaleString('en-IN') : '--';
            const crStr = r.cr ? '₹' + r.cr.toLocaleString('en-IN') : '--';
            thermalRowsHtml += `
            <div class="py-1.5 border-b border-dashed border-gray-400">
                <div class="flex justify-between font-bold text-[11px] mb-0.5">
                    <span>${formatDate(r.date)}</span>
                    <span>Bal: ₹${r.bal.toLocaleString('en-IN')}</span>
                </div>
                <div class="text-[10px] font-bold leading-tight">${r.label} ${r.ref ? `[${r.ref}]` : ''}</div>
                <div class="flex justify-between text-[10px] mt-1">
                    <span>Dr: ${drStr}</span>
                    <span>Cr: ${crStr}</span>
                </div>
            </div>`;
        });

        const thermalStatementHtml = `
        <div class="font-sans text-black w-full" style="box-sizing: border-box;">
            <div class="text-center mb-3">
                <img src="assets/logo.png" alt="MBB Logo" class="w-16 h-16 mx-auto mb-1 filter-primary-blue" style="filter: brightness(0) saturate(100%) invert(15%) sepia(77%) saturate(6295%) hue-rotate(224deg) brightness(83%) contrast(107%) !important;">
                <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 28px; color: #0033cc !important; line-height: 1; margin-bottom: 4px;">${COMPANY_DETAILS.name}</h1>
                <p class="text-[11px] font-bold">${COMPANY_DETAILS.phone1} | ${COMPANY_DETAILS.phone2}</p>
                <p class="text-[10px]">${COMPANY_DETAILS.address}</p>
            </div>
            <div class="border-y border-dashed border-black py-2 mb-2 text-[11px]">
                <div class="text-center font-bold text-[13px] uppercase tracking-wider mb-2">LEDGER STATEMENT</div>
                <p><span class="font-bold">Client:</span> ${client.printName}</p>
                <p><span class="font-bold">Period:</span> ${data.from} <br/>to ${data.to}</p>
            </div>
            <div class="mb-2">
                ${thermalRowsHtml}
            </div>
            <div class="border-t-[1.5px] border-black pt-2 pb-4 text-[11px]">
                <div class="flex justify-between font-black text-[13px] mb-2">
                    <span>CLOSING BAL:</span>
                    <span>₹ ${data.balance.toLocaleString('en-IN')}</span>
                </div>
                <div class="text-center text-[10px] text-gray-600 italic mt-3">
                    Generated: ${new Date().toLocaleDateString()}
                </div>
                <div class="text-center font-bold text-[11px] uppercase tracking-widest mt-4 border-t border-dashed border-black pt-3">
                    *** END OF STATEMENT ***
                </div>
            </div>
        </div>`;

        const thermalContainer = document.createElement('div');
        thermalContainer.className = 'thermal-layout-container hidden';
        thermalContainer.style.display = 'none';
        thermalContainer.innerHTML = thermalStatementHtml;
        content.appendChild(thermalContainer);
    }

    setTimeout(() => {
        setPrintScale(window.currentScaleMode || '100%');
    }, 50);
}

function updatePageHeightDebugger() {
    const debugInput = document.getElementById('debug-page-heights');
    if (!debugInput) return;

    const isThermal = document.body.classList.contains('print-thermal');

    if (isThermal) {
        const container = document.getElementById('print-content');
        debugInput.value = `Therm: ${container.offsetHeight}`;
        debugInput.classList.remove('text-rose-400');
        debugInput.classList.add('text-emerald-400');
    } else {
        const a4Pages = document.querySelectorAll('.a4-layout-container .preview-a4');
        if (a4Pages.length > 0) {
            const heights = Array.from(a4Pages).map(p => p.offsetHeight);
            debugInput.value = heights.join(', ');

            if (heights.some(h => h > 1125)) {
                debugInput.classList.remove('text-emerald-400');
                debugInput.classList.add('text-rose-400', 'font-bold');
            } else {
                debugInput.classList.remove('text-rose-400', 'font-bold');
                debugInput.classList.add('text-emerald-400');
            }
        } else {
            debugInput.value = 'N/A';
        }
    }
}

window.reprintDoc = reprintDoc;
window.printStatement = printStatement;
window.closePrintView = closePrintView;
window.setPrintLayout = setPrintLayout;
window.setPrintScale = setPrintScale;
window.openPrintPreview = openPrintPreview;
window.updatePageHeightDebugger = updatePageHeightDebugger;