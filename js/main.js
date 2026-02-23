// --- MAIN UI REFRESH ---
function refreshUI() {
    populateDatalists();
    renderWorkEntriesList();
    renderInvoices();
    renderQuotes();
    renderPayments();
    renderClients();
}

function toggleWeQty() {
    const toggle = document.getElementById('we-qty-toggle');
    const qtyCont = document.getElementById('we-qty-container');
    const costCont = document.getElementById('we-cost-container');
    const costLabel = document.getElementById('we-cost-label');

    if (toggle.checked) {
        qtyCont.classList.remove('hidden');
        costCont.classList.remove('md:col-span-2'); // Shrink cost to make room for Qty
        costLabel.innerText = 'Cost / Item (₹)';
    } else {
        qtyCont.classList.add('hidden');
        costCont.classList.add('md:col-span-2'); // Expand cost to fill the grid
        costLabel.innerText = 'Cost (₹)';
    }
}

function toggleQuoteQty() {
    const toggle = document.getElementById('quote-qty-toggle');
    const qtyCont = document.getElementById('quote-qty-container');
    const costCont = document.getElementById('quote-cost-container');
    const costLabel = document.getElementById('quote-cost-label');

    if (toggle.checked) {
        qtyCont.classList.remove('hidden');
        costCont.classList.remove('md:col-span-2');
        costLabel.innerText = 'Cost / Item (₹)';
    } else {
        qtyCont.classList.add('hidden');
        costCont.classList.add('md:col-span-2');
        costLabel.innerText = 'Est. Cost (₹)';
    }
}

// --- DETAILS POPUP ---
function showDetails(type, id) {
    const modalBody = document.getElementById('modal-details-body');
    const modalTitle = document.getElementById('modal-details-title');
    const modalFooter = document.getElementById('modal-details-footer');
    if (!modalBody || !modalTitle || !modalFooter) return;

    let html = ''; modalFooter.classList.add('hidden'); modalFooter.innerHTML = '';

    if (type === 'WE') {
        const item = appDB.work_entries.find(w => w.entryId === id);
        if (!item) return;
        const client = getClientById(item.clientId);
        const isBilled = item.status === 'BILLED';
        modalTitle.innerText = "Work Entry Detail";
        html = `
        <div class="space-y-3">
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">CLIENT</span><span class="font-bold">${client.shortName}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">VEHICLE</span><span class="font-bold uppercase">${item.vehicle}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">DATE</span><span class="font-bold">${formatDate(item.date)}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">STATUS</span><span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isBilled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${item.status}</span></div>
           <div class="pt-2"><p class="text-[10px] font-bold text-slate-400 uppercase mb-2">WORK ITEMS</p>
              <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-2">
                 ${item.items.map(it => `<div class="flex justify-between text-xs"><span>${it.workDone}</span><span class="font-bold">₹${it.cost}</span></div>`).join('')}
                 <div class="border-t pt-2 flex justify-between font-bold text-primary-600"><span>TOTAL</span><span>₹${item.totalCost}</span></div>
              </div>
           </div>
           ${isBilled ? `
             <div class="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mt-4 border border-blue-100 dark:border-blue-800">
               <div>
                 <p class="text-[10px] font-bold text-blue-500 uppercase">Billed On</p>
                 <p class="font-bold text-sm text-blue-700 dark:text-blue-400">${appDB.documents.find(d => d.docId === item.docId)?.docNumber || 'Invoice'}</p>
               </div>
               <button onclick="openLinkedDoc('INV', '${item.docId}')" class="text-xs font-bold bg-white dark:bg-blue-800 text-blue-600 dark:text-white px-3 py-1.5 rounded-lg shadow-sm">View &rarr;</button>
             </div>
             <p class="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg mt-2 italic text-center">Billed Entry: Edit/Delete disabled. Delete related invoice first.</p>
           ` : ''}
        </div>`;
        if (!isBilled) {
            modalFooter.innerHTML = `<button onclick="deleteWE('${item.entryId}')" class="text-rose-500 font-bold px-4 py-2 hover:bg-rose-50 rounded-lg">Delete</button>
                                     <button onclick="editWE('${item.entryId}')" class="bg-slate-800 text-white px-6 py-2 rounded-xl">Edit</button>`;
            modalFooter.classList.remove('hidden');
        }
    } else if (type === 'INV') {
        const item = appDB.documents.find(d => d.docId === id);
        if (!item) return;
        const client = getClientById(item.clientId);
        const isLocked = item.status === 'LOCKED';
        modalTitle.innerText = "Invoice Detail";
        const isTaxable = item.isTaxable !== false; // default true for backwards compatibility
        const taxToggleHtml = isLocked
            ? `<div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">GST TYPE</span><span class="font-bold ${isTaxable ? 'text-emerald-600' : 'text-amber-600'}">${isTaxable ? 'Taxable (18% GST)' : 'Non-Taxable (Memo)'}</span></div>`
            : `<div class="flex justify-between items-center border-b pb-2">
                 <span class="text-xs font-bold text-slate-400">GST TYPE</span>
                 <label class="flex items-center gap-2 cursor-pointer">
                   <span class="text-xs font-semibold ${!isTaxable ? 'text-amber-600' : 'text-slate-400'}">Non-Taxable</span>
                   <div class="relative">
                     <input type="checkbox" id="gst-toggle-${item.docId}" class="sr-only" ${isTaxable ? 'checked' : ''} onchange="recalculateInvoiceTax('${item.docId}', this.checked)">
                     <div class="w-10 h-5 rounded-full transition-colors ${isTaxable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} flex items-center px-0.5">
                       <div class="w-4 h-4 bg-white rounded-full shadow transition-transform ${isTaxable ? 'translate-x-5' : 'translate-x-0'}"></div>
                     </div>
                   </div>
                   <span class="text-xs font-semibold ${isTaxable ? 'text-emerald-600' : 'text-slate-400'}">Taxable (18%)</span>
                 </label>
               </div>`;
        html = `
        <div class="space-y-3">
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">DOC NO</span><span class="font-bold">${item.docNumber}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">CLIENT</span><span class="font-bold">${client.shortName}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">DATE</span><span class="font-bold">${formatDate(item.date)}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">TOTAL</span><span class="font-black">₹${Math.round(item.grandTotal)}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">STATUS</span><span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isLocked ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}">${item.status}</span></div>
           ${taxToggleHtml}
           ${item.linkedQuoteId ? `
             <div class="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl mt-4 border border-purple-100 dark:border-purple-800">
               <div>
                 <p class="text-[10px] font-bold text-purple-500 uppercase">Generated From</p>
                 <p class="font-bold text-sm text-purple-700 dark:text-purple-400">Quote ${appDB.documents.find(d => d.docId === item.linkedQuoteId)?.docNumber || ''}</p>
               </div>
               <button onclick="openLinkedDoc('QUOTE', '${item.linkedQuoteId}')" class="text-xs font-bold bg-white dark:bg-purple-800 text-purple-600 dark:text-white px-3 py-1.5 rounded-lg shadow-sm">&larr; View</button>
             </div>
           ` : ''}
        </div>`;
        modalFooter.innerHTML = `
            <button onclick="deleteInvoice('${item.docId}')" class="text-rose-500 font-bold px-4 py-2 hover:bg-rose-50 rounded-lg ${isLocked ? 'hidden' : ''}">Delete</button>
            <button onclick="reprintDoc('${item.docId}')" class="bg-primary-600 text-white px-6 py-2 rounded-xl">Print / Preview</button>
            ${isLocked
                ? `<span class="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-6 py-2 rounded-xl font-bold text-sm cursor-not-allowed">Locked ✓</span>`
                : `<button onclick="lockInvoice('${item.docId}')" class="bg-slate-800 text-white px-6 py-2 rounded-xl">Lock &amp; Send</button>`
            }
        `;
        modalFooter.classList.remove('hidden');
    } else if (type === 'QUOTE') {
        const item = appDB.documents.find(d => d.docId === id);
        if (!item) return;
        const client = getClientById(item.clientId);
        const isLocked = item.status === 'LOCKED';
        modalTitle.innerText = "Quotation Detail";

        html = `
        <div class="space-y-3">
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">EST NO</span><span class="font-bold">${item.docNumber}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">CLIENT</span><span class="font-bold">${client.shortName}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">VEHICLE</span><span class="font-bold uppercase">${item.lineItems[0] ? item.lineItems[0].vehicle : '--'}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">TOTAL</span><span class="font-black">₹${item.grandTotal}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">STATUS</span><span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isLocked ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}">${item.status || 'DRAFT'}</span></div>
           ${item.isConverted && (item.linkedEntryId || item.linkedDocId) ? `
             <div class="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl mt-4 border border-emerald-100 dark:border-emerald-800">
               <div>
                 <p class="text-[10px] font-bold text-emerald-500 uppercase">Converted To</p>
                 <p class="font-bold text-sm text-emerald-700 dark:text-emerald-400">${item.linkedDocId ? (appDB.documents.find(d => d.docId === item.linkedDocId)?.docNumber || 'Invoice') : 'Work Entry'}</p>
               </div>
               <button onclick="openLinkedDoc('${item.linkedDocId ? 'INV' : 'WE'}', '${item.linkedDocId || item.linkedEntryId}')" class="text-xs font-bold bg-white dark:bg-emerald-800 text-emerald-600 dark:text-white px-3 py-1.5 rounded-lg shadow-sm">View &rarr;</button>
             </div>
           ` : ''}
        </div>`;

        modalFooter.innerHTML = `
            ${!isLocked ? `<button onclick="deleteQuote('${item.docId}')" class="text-rose-500 font-bold px-4 py-2 hover:bg-rose-50 rounded-lg">Delete</button>` : ''}
            <button onclick="duplicateQuote('${item.docId}')" class="text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 rounded-lg hidden md:block">Revise/Duplicate</button>
            <button onclick="reprintDoc('${item.docId}')" class="bg-primary-600 text-white px-6 py-2 rounded-xl">Print</button>
            ${!isLocked
                ? `<button onclick="lockQuote('${item.docId}')" class="bg-slate-800 text-white px-6 py-2 rounded-xl">Lock &amp; Finalize</button>`
                : (!item.isConverted
                    ? `<button onclick="convertQuoteToWorkEntry('${item.docId}')" class="bg-emerald-600 text-white px-6 py-2 rounded-xl shadow-md">Add to Work Entries</button>`
                    : `<span class="bg-emerald-100 text-emerald-700 font-bold px-6 py-2 rounded-xl flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Converted</span>`)
            }
        `;
        modalFooter.classList.remove('hidden');
    } else if (type === 'PAY') {
        const item = appDB.payments.find(p => p.paymentId === id);
        if (!item) return;
        const client = getClientById(item.clientId);
        modalTitle.innerText = "Payment Detail";
        html = `
        <div class="space-y-3">
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">DATE</span><span class="font-bold">${formatDate(item.date)}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">CLIENT</span><span class="font-bold">${client.shortName}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">METHOD</span><span class="font-bold italic">${item.method}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">AMOUNT</span><span class="font-black text-emerald-600">₹${item.amount}</span></div>
        </div>`;
        modalFooter.innerHTML = `<button onclick="deletePayment('${item.paymentId}')" class="text-rose-500 font-bold px-4 py-2 hover:bg-rose-50 rounded-lg">Delete</button>`;
        modalFooter.classList.remove('hidden');
    } else if (type === 'CLIENT') {
        const item = appDB.clients.find(c => c.clientId === id);
        if (!item) return;
        modalTitle.innerText = "Client Detail";
        html = `
        <div class="space-y-3">
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">SHORT NAME</span><span class="font-bold">${item.shortName} ${item.isArchived ? '<span class="text-[9px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded ml-1">ARCHIVED</span>' : ''}</span></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">PRINT NAME</span><span class="font-bold">${item.printName}</span></div>
           <div><p class="text-[10px] font-bold text-slate-400 uppercase mb-1">ADDRESS</p><p class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs">${item.address || "N/A"}</p></div>
           <div class="flex justify-between border-b pb-2"><span class="text-xs font-bold text-slate-400">GSTIN</span><span class="font-mono font-bold">${item.gstin || "N/A"}</span></div>
        </div>`;
        modalFooter.innerHTML = `
            <button onclick="archiveClient('${item.clientId}')" class="text-slate-500 hover:text-rose-500 font-bold px-4 py-2 hover:bg-slate-50 rounded-lg">${item.isArchived ? 'Unarchive Client' : 'Archive Client'}</button>
            <button onclick="editClient('${item.clientId}')" class="bg-slate-800 text-white px-6 py-2 rounded-xl">Edit Data</button>
        `;
        modalFooter.classList.remove('hidden');
    }

    modalBody.innerHTML = html;
    openModal('modal-details');
}

function openLinkedDoc(type, id) {
    closeAllModals(); // Close current modal first
    setTimeout(() => {
        showDetails(type, id);
    }, 150); // Small delay for modal transition
}

// --- CORE DATA HELPERS ---
function populateDatalists() {
    const clientList = document.getElementById('client-datalist');
    if (clientList) {
        clientList.innerHTML = appDB.clients
            .filter(c => !c.isArchived)
            .map(c => `<option value="${c.shortName}">`).join('');
    }

    const workHistory = document.getElementById('work-history-list');
    if (workHistory) {
        let uniqueWorks = new Set();
        appDB.work_entries.forEach(w => w.items.forEach(it => {
            // Strip the # and everything after it to prevent duplicate suggestions
            const cleanDesc = it.workDone.split('#')[0].trim();
            uniqueWorks.add(cleanDesc);
        }));
        workHistory.innerHTML = Array.from(uniqueWorks).map(w => `<option value="${w}">`).join('');
    }
}

function getClientIdByName(name) {
    const c = appDB.clients.find(c => c.shortName.toLowerCase() === name.toLowerCase());
    return c ? c.clientId : null;
}

function getClientById(id) {
    return appDB.clients.find(c => c.clientId === id) || { shortName: "Unknown", printName: "Unknown", address: "", gstin: "" };
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- TAB 1: WORK ENTRIES ---
function openWorkEntryModal() {
    document.getElementById('we-edit-id').value = '';
    document.getElementById('we-linked-quote').value = '';
    document.getElementById('modal-we-title').innerText = "Add Vehicle Entry";
    document.getElementById('we-client').value = '';
    document.getElementById('we-vehicle').value = '';
    // Reset the Qty toggle safely
    const toggle = document.getElementById('we-qty-toggle');
    if (toggle) { toggle.checked = false; toggleWeQty(); }
    draftWorkItems = [];
    renderWEItemsTable();
    openModal('modal-we');
}

function addWorkSubItem() {
    let desc = document.getElementById('we-work').value;
    let cost = parseFloat(document.getElementById('we-cost').value);
    const toggle = document.getElementById('we-qty-toggle');

    if (!desc || isNaN(cost)) return;

    if (toggle && toggle.checked) {
        const qty = parseInt(document.getElementById('we-qty').value) || 1;
        if (qty > 1) {
            desc = `${desc} #${qty}`;
            cost = cost * qty;
        }
    }

    draftWorkItems.push({ workDone: desc.toUpperCase(), cost: cost });

    document.getElementById('we-work').value = '';
    document.getElementById('we-cost').value = '';
    if (toggle && toggle.checked) document.getElementById('we-qty').value = '1';

    renderWEItemsTable();
}

function removeWorkSubItem(idx) {
    draftWorkItems.splice(idx, 1);
    renderWEItemsTable();
}

function renderWEItemsTable() {
    const tbody = document.getElementById('we-draft-tbody');
    let total = 0;
    tbody.innerHTML = draftWorkItems.map((it, idx) => {
        total += it.cost;
        return `<tr><td class="p-3">${it.workDone}</td><td class="p-3 text-right">₹${it.cost}</td><td class="p-3 text-center"><button onclick="removeWorkSubItem(${idx})" class="text-rose-500 font-bold">×</button></td></tr>`;
    }).join('');
    document.getElementById('we-draft-total').innerText = total.toFixed(2);
}

function saveWorkEntry() {
    const date = document.getElementById('we-date').value;
    const clientName = document.getElementById('we-client').value;
    const vehicle = document.getElementById('we-vehicle').value.toUpperCase();
    const editId = document.getElementById('we-edit-id').value;
    const clientId = getClientIdByName(clientName);

    if (!clientId) return alert("Select valid client");
    if (!vehicle) return alert("Vehicle required");
    if (draftWorkItems.length === 0) return alert("Add at least one work item");

    const total = draftWorkItems.reduce((acc, it) => acc + it.cost, 0);
    const entryData = { date, clientId, vehicle, items: [...draftWorkItems], totalCost: total };

    if (editId) {
        const idx = appDB.work_entries.findIndex(w => w.entryId === editId);
        appDB.work_entries[idx] = { ...appDB.work_entries[idx], ...entryData };
    } else {
        appDB.work_entries.push({ entryId: 'WE-' + Date.now(), ...entryData, status: 'UNBILLED', docId: null });
    }

    saveDB(); refreshUI(); closeAllModals();
}

function clearWEFilters() {
    document.getElementById('filter-we-month').value = '';
    document.getElementById('filter-we-client').value = '';
    setFilter('we', 'UNBILLED');
}

function renderWorkEntriesList() {
    const month = document.getElementById('filter-we-month').value;
    const clientName = document.getElementById('filter-we-client').value;
    const status = document.getElementById('filter-we-status').value;
    const clientId = clientName ? getClientIdByName(clientName) : null;

    let filtered = appDB.work_entries.filter(w => {
        if (month && !w.date.startsWith(month)) return false;
        if (clientId && w.clientId !== clientId) return false;
        if (status !== 'ALL' && w.status !== status) return false;
        return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const tbody = document.getElementById('we-list-tbody');
    tbody.innerHTML = filtered.map(w => {
        const c = getClientById(w.clientId);
        const isBilled = w.status === 'BILLED';
        const cb = isBilled ? '' : `<input type="checkbox" data-id="${w.entryId}" onchange="updateBulkBillButton()" class="we-checkbox w-4 h-4 rounded text-primary-600 block mx-auto">`;
        return `
        <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors pointer shadow-sm" onclick="showDetails('WE', '${w.entryId}')">
            <td class="p-4 text-center" onclick="event.stopPropagation()">${cb}</td>
            <td class="p-4 font-medium">${formatDate(w.date)}</td>
            <td class="p-4">
               <div class="font-bold text-slate-900 dark:text-white">${c.shortName}</div>
               <div class="text-[10px] text-slate-400 truncate w-32">${c.printName}</div>
            </td>
            <td class="p-4 uppercase font-bold text-primary-600">${w.vehicle}</td>
            <td class="p-4 text-right font-black">₹${w.totalCost}</td>
            <td class="p-4 text-center" onclick="event.stopPropagation()">${isBilled ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">BILLED</span>' : '<button onclick="deleteWE(\'' + w.entryId + '\')" class="text-slate-300 hover:text-rose-500 transition-colors p-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>'}</td>
        </tr>
        <div class="md:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" onclick="showDetails('WE', '${w.entryId}')">
            <div class="flex justify-between items-start">
               <div class="flex items-center gap-3">
                  <div onclick="event.stopPropagation()">${cb}</div>
                  <div><p class="text-[10px] text-slate-400 font-bold uppercase">${formatDate(w.date)}</p><p class="font-black text-slate-900 dark:text-white">${c.shortName}</p></div>
               </div>
               <div class="text-right"><p class="font-extrabold text-primary-600">${w.vehicle}</p><p class="font-black">₹${w.totalCost}</p></div>
            </div>
        </div>`;
    }).join('');
    updateBulkBillButton();
}

function editWE(id) {
    const w = appDB.work_entries.find(e => e.entryId === id); if (!w) return;
    if (w.status === 'BILLED') return alert("Billed entry cannot be edited. Delete the related invoice first.");
    closeAllModals();
    openWorkEntryModal();
    document.getElementById('we-edit-id').value = w.entryId;
    document.getElementById('we-date').value = w.date;
    document.getElementById('we-client').value = getClientById(w.clientId).shortName;
    document.getElementById('we-vehicle').value = w.vehicle;
    document.getElementById('modal-we-title').innerText = "Edit Vehicle Entry";
    draftWorkItems = [...w.items];
    renderWEItemsTable();
}

function deleteWE(id) {
    const w = appDB.work_entries.find(e => e.entryId === id);
    if (w && w.status === 'BILLED') return alert("This entry is attached to an invoice. Delete the invoice first.");
    if (!confirm("Delete this entry?")) return;
    appDB.work_entries = appDB.work_entries.filter(w => w.entryId !== id);
    saveDB(); refreshUI(); closeAllModals();
}

function toggleAllWE(cb) {
    document.querySelectorAll('.we-checkbox').forEach(el => el.checked = cb.checked);
    updateBulkBillButton();
}

function updateBulkBillButton() {
    const checked = document.querySelectorAll('.we-checkbox:checked');
    const btn = document.getElementById('btn-generate-bill');
    if (checked.length > 0) {
        btn.disabled = false; btn.innerText = `Generate Bill for ${checked.length} Items`;
        btn.classList.replace('bg-slate-200', 'bg-emerald-600'); btn.classList.replace('text-slate-400', 'text-white'); btn.classList.remove('cursor-not-allowed');
    } else {
        btn.disabled = true; btn.innerText = "Select Entries to Bill";
        btn.classList.replace('bg-emerald-600', 'bg-slate-200'); btn.classList.replace('text-white', 'text-slate-400'); btn.classList.add('cursor-not-allowed');
    }
}

function bulkGenerateBill() {
    const selectedIds = Array.from(document.querySelectorAll('.we-checkbox:checked')).map(el => el.dataset.id);
    const selectedEntries = appDB.work_entries.filter(w => selectedIds.includes(w.entryId));

    // Validate same client
    const clientIds = new Set(selectedEntries.map(e => e.clientId));
    if (clientIds.size > 1) return alert("Select entries for the same client");

    const cid = Array.from(clientIds)[0];
    let tax = 0; let lineItems = [];
    selectedEntries.forEach(w => {
        w.status = 'BILLED';
        w.items.forEach(it => {
            tax += it.cost;
            lineItems.push({ date: w.date, vehicle: w.vehicle, workDone: it.workDone, cost: it.cost });
        });
    });

    const docId = 'DOC-' + Date.now();
    selectedEntries.forEach(w => w.docId = docId);

    appDB.documents.push({
        docId: docId, type: 'INVOICE', docNumber: 'DRAFT',
        clientId: cid, date: new Date().toISOString().split('T')[0], status: 'DRAFT',
        isTaxable: true,
        lineItems: lineItems, taxable: tax, cgst: tax * 0.09, sgst: tax * 0.09, grandTotal: tax * 1.18
    });

    saveDB(); refreshUI(); switchTab('bills');
}

// --- TAB 2: INVOICES ---
function clearInvFilters() {
    document.getElementById('filter-inv-month').value = '';
    document.getElementById('filter-inv-client').value = '';
    setFilter('inv', 'ALL');
}

function renderInvoices() {
    const month = document.getElementById('filter-inv-month').value;
    const clientName = document.getElementById('filter-inv-client').value;
    const status = document.getElementById('filter-inv-status').value;
    const clientId = clientName ? getClientIdByName(clientName) : null;

    let filtered = appDB.documents.filter(d => d.type === 'INVOICE').filter(d => {
        if (month && !d.date.startsWith(month)) return false;
        if (clientId && d.clientId !== clientId) return false;
        if (status !== 'ALL' && d.status !== status) return false;
        return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const tbody = document.getElementById('past-bills-tbody');
    tbody.innerHTML = filtered.map(d => {
        const c = getClientById(d.clientId);
        const isLocked = d.status === 'LOCKED';
        const opt = [
            { label: 'Print / Preview', onClick: `reprintDoc('${d.docId}')`, classes: 'text-primary-600' },
            ...(!isLocked ? [{ label: 'Lock & Send', onClick: `lockInvoice('${d.docId}')`, classes: 'text-emerald-600' }] : []),
            ...(!isLocked ? [{ label: 'Delete Invoice', onClick: `deleteInvoice('${d.docId}')`, classes: 'text-rose-600' }] : [])
        ];
        return `
        <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 pointer transition-colors" onclick="showDetails('INV', '${d.docId}')">
            <td class="p-4 font-bold text-slate-500">${d.docNumber}</td>
            <td class="p-4">${formatDate(d.date)}</td>
            <td class="p-4">
                <div class="font-bold">${c.shortName}</div>
                <div class="text-[10px] text-slate-400">${c.printName}</div>
            </td>
            <td class="p-4"><span class="px-2 py-1 rounded-full text-[10px] font-black ${isLocked ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}">${d.status}</span></td>
            <td class="p-4 text-right font-black">₹${Math.round(d.grandTotal)}</td>
            <td class="p-4 text-center" onclick="event.stopPropagation()">${createKebabMenu('kb-' + d.docId, opt)}</td>
        </tr>
        <div class="md:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" onclick="showDetails('INV', '${d.docId}')">
           <div class="flex justify-between items-start mb-3">
              <div><p class="text-[10px] text-slate-400 font-bold uppercase">${d.docNumber} | ${formatDate(d.date)}</p><p class="font-black text-slate-900 dark:text-white">${c.shortName}</p></div>
              <div class="text-right font-black text-lg">₹${Math.round(d.grandTotal)}</div>
           </div>
           <div class="flex justify-between items-center pt-3 border-t">
              <span class="px-2 py-1 rounded-full text-[10px] font-black ${isLocked ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}">${d.status}</span>
              <div onclick="event.stopPropagation()">${createKebabMenu('kbm-' + d.docId, opt)}</div>
           </div>
        </div>`;
    }).join('');
}

function lockInvoice(id) {
    const d = appDB.documents.find(doc => doc.docId === id);
    if (!d || d.status === 'LOCKED') return; // One-way: DRAFT → LOCKED only

    if (d.docNumber === 'DRAFT') {
        const dDate = new Date(d.date);
        const yy = dDate.getFullYear().toString().slice(-2);
        const mm = (dDate.getMonth() + 1).toString().padStart(2, '0');
        const isTaxable = d.isTaxable !== false;
        const prefix = `${yy}${mm}-${isTaxable ? 'R' : 'M'}`;

        // Find existing invoices in this exact sequence
        const existingInThisSeq = appDB.documents
            .filter(doc => doc.type === 'INVOICE' && doc.status === 'LOCKED' && doc.docNumber.startsWith(prefix))
            .map(doc => parseInt(doc.docNumber.replace(prefix, ''), 10))
            .filter(n => !isNaN(n));

        const highestSeq = existingInThisSeq.length > 0 ? Math.max(...existingInThisSeq) : 0;
        const nextSeq = (highestSeq + 1).toString().padStart(3, '0');

        d.docNumber = prefix + nextSeq;
    }

    d.status = 'LOCKED';
    saveDB(); refreshUI(); closeAllModals();
}

function recalculateInvoiceTax(docId, isTaxable) {
    const d = appDB.documents.find(doc => doc.docId === docId);
    if (!d || d.status === 'LOCKED') return;
    d.isTaxable = isTaxable;
    const base = d.lineItems.reduce((sum, it) => sum + it.cost, 0);
    d.taxable = base;
    d.cgst = isTaxable ? base * 0.09 : 0;
    d.sgst = isTaxable ? base * 0.09 : 0;
    d.grandTotal = isTaxable ? base * 1.18 : base;
    saveDB();
    // Re-render the modal in place to reflect new totals
    showDetails('INV', docId);
}

function setFilter(type, val) {
    document.getElementById(`filter-${type}-status`).value = val;
    // Update active UI state for pills
    const parentContainer = document.getElementById(`filter-${type}-status`).nextElementSibling;
    parentContainer.querySelectorAll('button').forEach(btn => {
        btn.className = "pill-btn whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors";
    });
    document.getElementById(`btn-${type}-${val}`).className = "pill-btn whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold bg-primary-600 text-white transition-colors shadow-sm";

    if (type === 'we') renderWorkEntriesList();
    if (type === 'inv') renderInvoices();
}

function deleteInvoice(id) {
    const d = appDB.documents.find(doc => doc.docId === id);
    if (d && d.status === 'LOCKED') return alert("Locked invoices cannot be deleted. They are permanently locked for accounting integrity.");
    if (!confirm("Delete Invoice? Related work entries will become UNBILLED.")) return;
    appDB.work_entries.forEach(w => { if (w.docId === id) { w.status = 'UNBILLED'; w.docId = null; } });
    appDB.documents = appDB.documents.filter(d => d.docId !== id);
    saveDB(); refreshUI(); closeAllModals();
}

// --- TAB 3: QUOTATIONS ---
function openQuoteModal() {
    draftQuoteItems = [];
    document.getElementById('quote-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('quote-client').value = '';
    document.getElementById('quote-vehicle').value = '';

    // Reset the Qty toggle
    const toggle = document.getElementById('quote-qty-toggle');
    if (toggle) { toggle.checked = false; toggleQuoteQty(); }

    renderQuoteDraftTable();
    openModal('modal-quote');
}

function addQuoteItem() {
    let desc = document.getElementById('quote-item-desc').value;
    let cost = parseFloat(document.getElementById('quote-item-cost').value);
    const vehicle = document.getElementById('quote-vehicle').value.toUpperCase();
    const toggle = document.getElementById('quote-qty-toggle');

    if (!desc || isNaN(cost)) return;

    if (toggle && toggle.checked) {
        const qty = parseInt(document.getElementById('quote-qty').value) || 1;
        if (qty > 1) {
            desc = `${desc} #${qty}`;
            cost = cost * qty;
        }
    }

    draftQuoteItems.push({ vehicle, workDone: desc.toUpperCase(), cost });

    document.getElementById('quote-item-desc').value = '';
    document.getElementById('quote-item-cost').value = '';
    if (toggle && toggle.checked) document.getElementById('quote-qty').value = '1';

    renderQuoteDraftTable();
}

function removeQuoteItem(idx) {
    draftQuoteItems.splice(idx, 1);
    renderQuoteDraftTable();
}

function renderQuoteDraftTable() {
    const tbody = document.getElementById('quote-draft-tbody');
    tbody.innerHTML = draftQuoteItems.map((it, idx) => `<tr><td class="p-3">
       <div class="text-[10px] text-slate-400 font-bold">${it.vehicle}</div>
       <div>${it.workDone}</div>
    </td><td class="p-3 text-right font-bold">₹${it.cost}</td><td class="p-3 text-center"><button onclick="removeQuoteItem(${idx})" class="text-rose-500">×</button></td></tr>`).join('');
}

function generateQuote() {
    const date = document.getElementById('quote-date').value;
    const clientName = document.getElementById('quote-client').value;
    const clientId = getClientIdByName(clientName);
    if (!clientId || draftQuoteItems.length === 0) return alert("Required data missing");

    const tax = draftQuoteItems.reduce((acc, it) => acc + it.cost, 0);
    const docData = {
        docId: 'DOC-Q' + Date.now(),
        type: 'QUOTATION',
        docNumber: 'DRAFT', // Saves as draft initially
        status: 'DRAFT',    // New status field
        clientId,
        date,
        lineItems: [...draftQuoteItems],
        taxable: tax, cgst: 0, sgst: 0, grandTotal: tax,
        isConverted: false
    };
    appDB.documents.push(docData);
    saveDB(); refreshUI(); closeAllModals();
    openPrintPreview('QUOTATION', docData);
}

function lockQuote(id) {
    const q = appDB.documents.find(doc => doc.docId === id);
    if (!q || q.status === 'LOCKED') return;

    if (q.docNumber === 'DRAFT' || !q.docNumber) {
        const dDate = new Date(q.date);
        const yy = dDate.getFullYear().toString().slice(-2);
        const mm = (dDate.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${yy}${mm}-Q`;

        const existingInThisSeq = appDB.documents
            .filter(doc => doc.type === 'QUOTATION' && doc.status === 'LOCKED' && doc.docNumber.startsWith(prefix))
            .map(doc => parseInt(doc.docNumber.replace(prefix, ''), 10))
            .filter(n => !isNaN(n));

        const highestSeq = existingInThisSeq.length > 0 ? Math.max(...existingInThisSeq) : 0;
        const nextSeq = (highestSeq + 1).toString().padStart(3, '0');

        q.docNumber = prefix + nextSeq;
    }

    q.status = 'LOCKED';
    saveDB(); refreshUI(); closeAllModals();
}

function duplicateQuote(id) {
    const q = appDB.documents.find(doc => doc.docId === id);
    if (!q) return;

    closeAllModals();
    openQuoteModal();

    // Pre-fill the modal with the old quote's data
    const client = getClientById(q.clientId);
    document.getElementById('quote-client').value = client.shortName;
    document.getElementById('quote-vehicle').value = q.lineItems[0] ? q.lineItems[0].vehicle : '';

    // Deep copy the items so we don't accidentally edit the locked quote in memory
    draftQuoteItems = JSON.parse(JSON.stringify(q.lineItems));
    renderQuoteDraftTable();
}

function convertQuoteToWorkEntry(quoteId) {
    const quote = appDB.documents.find(d => d.docId === quoteId);
    if (!quote || quote.isConverted) return;

    // Group line items by vehicle
    const vehicleGroups = {};
    quote.lineItems.forEach(it => {
        const v = it.vehicle || 'UNKNOWN';
        if (!vehicleGroups[v]) vehicleGroups[v] = [];
        vehicleGroups[v].push({ workDone: it.workDone, cost: it.cost });
    });

    let firstNewEntryId = null;
    const dateStr = new Date().toISOString().split('T')[0];

    Object.keys(vehicleGroups).forEach((v, index) => {
        const items = vehicleGroups[v];
        const total = items.reduce((sum, i) => sum + i.cost, 0);
        const newEntryId = 'WE-' + Date.now() + '-' + index;
        if (!firstNewEntryId) firstNewEntryId = newEntryId;

        appDB.work_entries.push({
            entryId: newEntryId,
            date: dateStr,
            clientId: quote.clientId,
            vehicle: v === 'UNKNOWN' ? '' : v,
            items: items,
            totalCost: total,
            status: 'UNBILLED',
            docId: null,
            linkedQuoteId: quote.docId
        });
    });

    quote.isConverted = true;
    quote.linkedEntryId = firstNewEntryId;

    saveDB();
    refreshUI();
    closeAllModals();
    if (window.switchTab) window.switchTab('entries');
}

function renderQuotes() {
    const tbody = document.getElementById('past-quotes-tbody');
    const quotes = appDB.documents.filter(d => d.type === 'QUOTATION').sort((a, b) => b.date.localeCompare(a.date));
    tbody.innerHTML = quotes.map(q => {
        const c = getClientById(q.clientId);
        const isLocked = q.status === 'LOCKED';
        const statusBadge = `<span class="px-2 py-1 rounded-full text-[10px] font-black ${isLocked ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}">${q.status || 'DRAFT'}</span>`;

        const opt = [
            { label: 'Print View', onClick: `reprintDoc('${q.docId}')`, classes: 'text-primary-600' },
            { label: 'Revise / Duplicate', onClick: `duplicateQuote('${q.docId}')`, classes: 'text-indigo-600' },
            ...(!isLocked ? [{ label: 'Lock & Finalize', onClick: `lockQuote('${q.docId}')`, classes: 'text-emerald-600' }] : []),
            ...(!isLocked ? [{ label: 'Delete Draft', onClick: `deleteQuote('${q.docId}')`, classes: 'text-rose-600' }] : [])
        ];
        return `
        <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 pointer transition-colors" onclick="showDetails('QUOTE', '${q.docId}')">
            <td class="p-4 font-medium">${formatDate(q.date)}<br><span class="text-[10px] font-bold text-slate-400">${q.docNumber}</span></td>
            <td class="p-4"><div class="font-bold">${c.shortName}</div></td>
            <td class="p-4 italic text-xs">${q.lineItems[0] ? q.lineItems[0].vehicle : '--'}</td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4 text-right font-black">₹${q.grandTotal}</td>
            <td class="p-4 text-center" onclick="event.stopPropagation()">${createKebabMenu('kbq-' + q.docId, opt)}</td>
        </tr>
        <div class="md:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" onclick="showDetails('QUOTE', '${q.docId}')">
           <div class="flex justify-between items-start mb-2">
              <div><p class="text-[10px] text-slate-400 font-bold uppercase">${q.docNumber} | ${formatDate(q.date)}</p><p class="font-bold text-slate-900 dark:text-white">${c.shortName}</p></div>
              <div class="text-right font-black">₹${q.grandTotal}</div>
           </div>
           <div class="flex justify-between items-center border-t pt-3">
              ${statusBadge}
              <div onclick="event.stopPropagation()">${createKebabMenu('kbqm-' + q.docId, opt)}</div>
           </div>
        </div>`;
    }).join('');
}

function deleteQuote(id) {
    if (!confirm("Delete this quotation?")) return;
    appDB.documents = appDB.documents.filter(d => d.docId !== id);
    saveDB(); renderQuotes();
}

// --- TAB 4: PAYMENTS ---
function savePayment() {
    const date = document.getElementById('pay-date').value;
    const clientName = document.getElementById('pay-client').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const method = document.getElementById('pay-method').value;
    const clientId = getClientIdByName(clientName);
    if (!clientId || isNaN(amount)) return alert("Required data missing");

    appDB.payments.push({ paymentId: 'PAY-' + Date.now(), date, clientId, amount, method });
    saveDB(); refreshUI();
    document.getElementById('pay-amount').value = '';
}

function renderPayments() {
    const tbody = document.getElementById('payments-tbody');
    tbody.innerHTML = appDB.payments.sort((a, b) => b.date.localeCompare(a.date)).map(p => {
        const c = getClientById(p.clientId);
        return `
        <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 pointer transition-colors" onclick="showDetails('PAY', '${p.paymentId}')">
            <td class="p-4 underline">${formatDate(p.date)}</td>
            <td class="p-4 font-bold text-slate-700 dark:text-slate-200">${c.shortName}</td>
            <td class="p-4 italic">${p.method}</td>
            <td class="p-4 text-right font-black text-emerald-600">₹${p.amount}</td>
            <td class="p-4 text-center" onclick="event.stopPropagation()"><button onclick="deletePayment('${p.paymentId}')" class="text-slate-300 hover:text-rose-500 p-2">×</button></td>
        </tr>
        <div class="md:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center" onclick="showDetails('PAY', '${p.paymentId}')">
           <div><p class="text-[10px] text-slate-400 font-bold uppercase">${formatDate(p.date)}</p><p class="font-bold">${c.shortName}</p><p class="text-[10px] italic">${p.method}</p></div>
           <div class="flex items-center gap-4"><p class="font-black text-emerald-600">₹${p.amount}</p><button onclick="deletePayment('${p.paymentId}')" class="text-rose-500" onclick="event.stopPropagation()">×</button></div>
        </div>`;
    }).join('');
}

function deletePayment(id) {
    if (!confirm("Delete this payment?")) return;
    appDB.payments = appDB.payments.filter(p => p.paymentId !== id);
    saveDB(); renderPayments();
}

// --- TAB 5: STATEMENTS ---
// --- TAB 5: STATEMENTS ---
function generateStatement() {
    const clientName = document.getElementById('stmt-client').value;
    const fromDate = document.getElementById('stmt-from').value;
    const toDate = document.getElementById('stmt-to').value;
    const clientId = getClientIdByName(clientName);
    if (!clientId) return alert("Select Client");

    // 1. Calculate Previous Balance (Before fromDate)
    const pastBills = appDB.documents.filter(d => d.type === 'INVOICE' && d.clientId === clientId && d.date < fromDate);
    const pastPays = appDB.payments.filter(p => p.clientId === clientId && p.date < fromDate);

    const pastBilledTotal = pastBills.reduce((sum, d) => sum + d.grandTotal, 0);
    const pastPaidTotal = pastPays.reduce((sum, p) => sum + p.amount, 0);
    const previousBalance = pastBilledTotal - pastPaidTotal;

    // 2. Fetch Current Period Data
    const currentBills = appDB.documents.filter(d => d.type === 'INVOICE' && d.clientId === clientId && d.date >= fromDate && d.date <= toDate);
    const currentPays = appDB.payments.filter(p => p.clientId === clientId && p.date >= fromDate && p.date <= toDate);

    let currentRows = [];
    currentBills.forEach(d => currentRows.push({ date: d.date, label: 'Tax Invoice', ref: d.docNumber, dr: d.grandTotal, cr: 0 }));
    currentPays.forEach(p => currentRows.push({ date: p.date, label: 'Payment Received', ref: p.method, dr: 0, cr: p.amount }));

    // Sort current period rows by date
    currentRows.sort((a, b) => a.date.localeCompare(b.date));

    // 3. Assemble Final Rows and Calculate Running Balance
    let balance = previousBalance;
    let finalRows = [];

    // Always push the Brought Forward row first
    finalRows.push({
        date: fromDate,
        label: 'Previous Balance (Brought Forward)',
        ref: 'B/F',
        dr: 0,
        cr: 0,
        bal: balance,
        isBf: true // custom flag just in case we want to style it differently
    });

    // Add current rows and calculate running balance
    currentRows.forEach(r => {
        balance += (r.dr - r.cr);
        r.bal = balance;
        finalRows.push(r);
    });

    // 4. Update UI
    document.getElementById('stmt-balance').innerText = balance.toLocaleString('en-IN');
    const tbody = document.getElementById('stmt-tbody');

    tbody.innerHTML = finalRows.map(r => `
    <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 ${r.isBf ? 'bg-slate-50 dark:bg-slate-800/60' : ''}">
        <td class="p-4 ${r.isBf ? 'italic text-slate-500' : ''}">${formatDate(r.date)}</td>
        <td class="p-4"><p class="font-bold ${r.isBf ? 'text-slate-600 dark:text-slate-400' : ''}">${r.label}</p><p class="text-[10px] text-slate-400">${r.ref}</p></td>
        <td class="p-4 text-right text-rose-600 font-bold">${r.dr ? '₹' + r.dr.toLocaleString('en-IN') : '--'}</td>
        <td class="p-4 text-right text-emerald-600 font-bold">${r.cr ? '₹' + r.cr.toLocaleString('en-IN') : '--'}</td>
        <td class="p-4 text-right font-black">₹${r.bal.toLocaleString('en-IN')}</td>
    </tr>
    <div class="md:hidden ${r.isBf ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/30'} p-4 border-b border-slate-200 dark:border-slate-700">
       <div class="flex justify-between items-start mb-2">
          <div><p class="text-[9px] font-bold text-slate-400 mb-1">${formatDate(r.date)} | ${r.label}</p><p class="text-[10px] font-bold italic">${r.ref}</p></div>
          <p class="font-bold text-xs">Bal: ₹${r.bal.toLocaleString('en-IN')}</p>
       </div>
       ${!r.isBf ? `
       <div class="flex justify-end gap-3 text-xs">
          ${r.dr ? '<span class="text-rose-600">Dr: ₹' + r.dr.toLocaleString('en-IN') + '</span>' : ''}
          ${r.cr ? '<span class="text-emerald-600">Cr: ₹' + r.cr.toLocaleString('en-IN') + '</span>' : ''}
       </div>` : ''}
    </div>`).join('');

    document.getElementById('stmt-view-area').classList.remove('hidden');

    // Pass 'finalRows' to the print engine payload
    window.printPayload = { type: 'STATEMENT', clientId, from: fromDate, to: toDate, rows: finalRows, balance };
}

// --- TAB 6: CLIENTS ---
function openClientModal() {
    document.getElementById('client-edit-id').value = '';
    document.getElementById('client-short').value = '';
    document.getElementById('client-print').value = '';
    document.getElementById('client-address').value = '';
    document.getElementById('client-gstin').value = '';
    openModal('modal-client');
}

function saveClient() {
    const s = document.getElementById('client-short').value;
    const p = document.getElementById('client-print').value;
    const a = document.getElementById('client-address').value;
    const g = document.getElementById('client-gstin').value.toUpperCase();
    const id = document.getElementById('client-edit-id').value;
    if (!s || !p) return alert("Missing data");

    if (id) {
        const idx = appDB.clients.findIndex(c => c.clientId === id);
        appDB.clients[idx] = { ...appDB.clients[idx], shortName: s, printName: p, address: a, gstin: g };
    } else {
        appDB.clients.push({ clientId: 'C-' + Date.now(), shortName: s, printName: p, address: a, gstin: g });
    }
    saveDB(); refreshUI(); closeAllModals();
}

function renderClients() {
    const tbody = document.getElementById('clients-tbody');

    // Sort active clients first, archived clients last
    const sortedClients = [...appDB.clients].sort((a, b) => {
        if (a.isArchived === b.isArchived) return a.shortName.localeCompare(b.shortName);
        return a.isArchived ? 1 : -1;
    });

    tbody.innerHTML = sortedClients.map(c => {
        const rowOpacity = c.isArchived ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900/50' : '';
        const badge = c.isArchived ? '<span class="text-[9px] bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded ml-2 font-bold uppercase tracking-wider">Archived</span>' : '';

        return `
    <tr class="hidden md:table-row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 pointer transition-colors ${rowOpacity}" onclick="showDetails('CLIENT', '${c.clientId}')">
        <td class="p-4 font-bold flex items-center">${c.shortName} ${badge}</td>
        <td class="p-4">${c.printName}</td>
        <td class="p-4 font-mono text-xs">${c.gstin || '--'}</td>
        <td class="p-4 text-center" onclick="event.stopPropagation()"><button onclick="editClient('${c.clientId}')" class="text-primary-600 font-bold p-2 hover:bg-primary-50 rounded-lg">Edit</button></td>
    </tr>
    <div class="md:hidden p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center mb-3 ${rowOpacity ? 'bg-slate-100 dark:bg-slate-900' : 'bg-white dark:bg-slate-800 shadow-sm'}" onclick="showDetails('CLIENT', '${c.clientId}')">
       <div>
           <p class="font-bold text-slate-900 dark:text-white">${c.shortName} ${badge}</p>
           <p class="text-[10px] text-slate-500 truncate w-40">${c.printName}</p>
       </div>
       <button class="text-primary-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
    </div>`;
    }).join('');
}

function editClient(id) {
    const c = appDB.clients.find(x => x.clientId === id); if (!c) return;
    openClientModal();
    document.getElementById('client-edit-id').value = c.clientId;
    document.getElementById('client-short').value = c.shortName;
    document.getElementById('client-print').value = c.printName;
    document.getElementById('client-address').value = c.address || '';
    document.getElementById('client-gstin').value = c.gstin || '';
}

function archiveClient(id) {
    const c = appDB.clients.find(x => x.clientId === id);
    if (!c) return;

    // Toggle archival state
    c.isArchived = !c.isArchived;
    saveDB();

    // Refresh modal in place if currently viewing it
    showDetails('CLIENT', id);
    // Refresh background lists
    populateDatalists();
    renderClients();
}

// Global exports
window.refreshUI = refreshUI;
window.toggleWeQty = toggleWeQty;
window.toggleQuoteQty = toggleQuoteQty;
window.showDetails = showDetails;
window.populateDatalists = populateDatalists;
window.getClientIdByName = getClientIdByName;
window.getClientById = getClientById;
window.formatDate = formatDate;
window.openWorkEntryModal = openWorkEntryModal;
window.addWorkSubItem = addWorkSubItem;
window.removeWorkSubItem = removeWorkSubItem;
window.renderWEItemsTable = renderWEItemsTable;
window.saveWorkEntry = saveWorkEntry;
window.clearWEFilters = clearWEFilters;
window.renderWorkEntriesList = renderWorkEntriesList;
window.editWE = editWE;
window.deleteWE = deleteWE;
window.toggleAllWE = toggleAllWE;
window.updateBulkBillButton = updateBulkBillButton;
window.bulkGenerateBill = bulkGenerateBill;
window.clearInvFilters = clearInvFilters;
window.renderInvoices = renderInvoices;
window.lockInvoice = lockInvoice;
window.recalculateInvoiceTax = recalculateInvoiceTax;
window.setFilter = setFilter;
window.deleteInvoice = deleteInvoice;
window.openQuoteModal = openQuoteModal;
window.addQuoteItem = addQuoteItem;
window.removeQuoteItem = removeQuoteItem;
window.generateQuote = generateQuote;
window.lockQuote = lockQuote;
window.duplicateQuote = duplicateQuote;
window.convertQuoteToWorkEntry = convertQuoteToWorkEntry;
window.renderQuotes = renderQuotes;
window.deleteQuote = deleteQuote;
window.savePayment = savePayment;
window.renderPayments = renderPayments;
window.deletePayment = deletePayment;
window.generateStatement = generateStatement;
window.openClientModal = openClientModal;
window.saveClient = saveClient;
window.renderClients = renderClients;
window.editClient = editClient;
window.archiveClient = archiveClient;
