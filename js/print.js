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

function setPrintLayout(mode, colorMode = 'color') {
    const container = document.getElementById('print-content');
    if (!container) return;

    // Explicitly prevent CSS from clipping dynamic content
    container.style.overflow = 'visible';
    container.style.height = 'auto'; // Let it stretch naturally

    if (mode === 'thermal') {
        container.className = 'preview-thermal bg-white relative text-black mx-auto print:mx-0 print:w-full print:shadow-none';
        document.body.className = 'print-thermal';
    } else {
        container.className = 'preview-a4 bg-white relative text-black mx-auto print:mx-0 print:w-full print:shadow-none print:p-0';
        document.body.className = 'print-a4';
    }

    const logo = container.querySelector('img[alt="MBB Logo"]');
    if (logo) {
        if (mode === 'thermal' || colorMode === 'bw') {
            logo.classList.remove('filter-primary-blue');
            logo.style.cssText = 'filter: grayscale(100%) brightness(0%) !important;';
        } else {
            logo.classList.add('filter-primary-blue');
            logo.style.cssText = 'filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;';
        }
    }
}

function setPrintScale(scaleMode) {
    const wrapper = document.getElementById('print-scale-wrapper');
    const content = document.getElementById('print-content');
    if (!wrapper || !content) return;

    // Reset explicit heights to measure the true dynamic height
    wrapper.style.height = 'auto';
    content.style.height = 'auto';
    content.style.overflow = 'visible';

    // Get the base physical dimensions
    const isThermal = document.body.classList.contains('print-thermal');
    const baseWidth = isThermal ? 302 : 794;
    // Measure natural document height, with A4 minimum fallback
    const baseHeight = Math.max(isThermal ? 400 : 1123, content.offsetHeight);

    // Calculate available screen space (minus padding/header)
    const availableWidth = window.innerWidth - 32;
    const availableHeight = window.innerHeight - 100;

    let newScale = 1;

    // 100% (Fit Page) evaluates BOTH height and width, scaling to whichever constraints it first 
    // ensuring the ENTIRE document perfectly fits on your screen without scrolling or clipping.
    if (scaleMode === '100%' || scaleMode === 'fit-page') {
        const scaleW = availableWidth / baseWidth;
        const scaleH = availableHeight / baseHeight;
        newScale = Math.min(scaleW, scaleH);
    } else if (scaleMode === 'fit-width') {
        newScale = availableWidth / baseWidth;
    }

    newScale = Math.min(newScale, 2);
    wrapper.style.setProperty('--print-scale', newScale.toFixed(3));

    // CRITICAL FIX: Because CSS transform: scale() leaves visual ghost space, 
    // we explicitly lock the wrapper's physical height to the scaled equivalent.
    // This stops scroll-clipping and page overflow dead in its tracks.
    wrapper.style.height = (baseHeight * newScale) + 'px';
    wrapper.style.transformOrigin = 'top center';
}

function openPrintPreview(type, data) {
    const view = document.getElementById('print-view');
    const content = document.getElementById('print-content');
    if (!view || !content) return;

    view.classList.remove('bg-white', 'text-black');
    view.classList.add('bg-slate-100', 'dark:bg-slate-950');

    let html = '';
    const client = appDB.clients.find(c => c.clientId === data.clientId) || { printName: 'Unknown Client', address: '', gstin: '' };

    if (type === 'INVOICE' || type === 'QUOTATION') {
        const isInv = (type === 'INVOICE');
        const isTaxable = !isInv || data.isTaxable !== false;
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

        let itemRowsHtml = '';
        groups.forEach(g => {
            const workLines = g.items.map(it => `<div>${it.workDone}</div>`).join('');
            const costLines = g.items.map(it => `<div>${it.cost.toFixed(2)}</div>`).join('');

            // Standard thin inner borders to match the clean professional screenshot
            itemRowsHtml += `
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
                <td colspan="4" class="p-1.5 text-right font-bold text-[11px]" style="border-right: 1px solid black; color: black !important;">TAXABLE VALUE</td>
                <td class="p-1.5 text-right font-bold" style="color: black !important;">${data.taxable.toFixed(2)}</td>
            </tr>`;

        html = `
        <div class="text-black font-sans w-full" style="box-sizing: border-box; overflow: visible;">
            
            <!-- HEADER BLOCK (Classic Logo + Cursive Blue Type) -->
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center justify-start w-1/4">
                    <img src="assets/logo.png" alt="MBB Logo" class="w-20 h-20 object-contain filter-primary-blue" style="filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;">
                </div>
                <div class="text-center w-2/4">
                    <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 46px; color: #0033cc !important; line-height: 1; font-weight: normal; margin-bottom: 2px;">Mangala Body Builders</h1>
                </div>
                <div class="text-right text-[11px] font-bold w-1/4" style="color: black !important;">
                    <p>Santosh : 9822325571</p>
                    <p>Prashant : 9822356479</p>
                </div>
            </div>

            <!-- TAGLINE & GSTIN ROW -->
            <div class="text-center text-[10px] font-bold mb-2 flex justify-center gap-2" style="color: black !important;">
                <span>We Undertake All Kinds of Bus Repairing, Painting, Cushion Works etc.</span>
                ${isTaxable ? `<span>GSTIN: 27ALGPS0161C1Z4</span>` : ''}
            </div>

            <!-- ADDRESS LINE (Thin border exactly as requested) -->
            <div class="border-y border-black text-center py-1.5 text-[11px] font-medium mb-6" style="color: black !important;">
                Address : Sr. No. 44, Near Nanekar Garage, Chakan-Talegaon Road, Nanekarwadi, Chakan, Pune - 410501.
            </div>

            <!-- CLIENT & DOCUMENT INFO -->
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

            <!-- THE 5-COLUMN TABLE -->
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
                    ${itemRowsHtml}
                    <!-- Dynamic Empty Extender Row -->
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

            <!-- AMOUNT IN WORDS ATTACHED DIRECTLY UNDER TABLE -->
            <div class="border border-black border-t-0 p-2 text-[11px] font-bold uppercase mb-24" style="color: black !important;">
                ${window.numberToWords ? window.numberToWords(Math.round(data.grandTotal)) : ''}
            </div>

            <!-- SIGNATURE BLOCK -->
            <div class="flex justify-between items-end text-[12px] font-bold px-2" style="color: black !important;">
                <div>Receivers Signature</div>
                <div class="text-center">
                    <p class="mb-12">To, Mangala Body Builders</p>
                    <p>Authorised Signature</p>
                </div>
            </div>

        </div>`;
    } else if (type === 'STATEMENT') {
        html = `
        <div class="text-black font-sans w-full" style="box-sizing: border-box; overflow: visible;">
            <div class="flex flex-col items-center mb-4">
                <img src="assets/logo.png" alt="Mangala Logo" class="w-16 h-16 object-contain mb-2 filter-primary-blue" style="filter: invert(18%) sepia(99%) saturate(2740%) hue-rotate(213deg) brightness(93%) contrast(99%) !important;">
                <h1 style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 38px; color: #0033cc !important; line-height: 1;">Mangala Body Builders</h1>
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
    }

    content.innerHTML = html;

    setPrintLayout('a4', 'color');
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