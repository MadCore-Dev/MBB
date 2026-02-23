// --- THEME & UI SETUP ---
function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) { 
        document.documentElement.classList.add('dark'); 
    } else { 
        document.documentElement.classList.remove('dark'); 
    }
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Initialize theme immediately
initTheme();

// --- SIDEBAR & MENU LOGIC ---
function toggleSidebar(forceClose = false) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    
    if (forceClose || !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        overlay.classList.remove('hidden');
        setTimeout(() => { 
            overlay.classList.add('opacity-100'); 
            sidebar.classList.remove('-translate-x-full'); 
        }, 10);
    }
}

let activeMenuId = null;
document.addEventListener('click', (e) => {
    if (activeMenuId && !e.target.closest('.menu-container')) {
        const menu = document.getElementById(activeMenuId);
        if (menu) menu.classList.add('hidden');
        activeMenuId = null;
    }
});

function toggleMenu(e, id) {
    if (e) e.stopPropagation();
    if (activeMenuId && activeMenuId !== id) {
        const prevMenu = document.getElementById(activeMenuId);
        if (prevMenu) prevMenu.classList.add('hidden');
    }
    const menu = document.getElementById(id); 
    if (menu) {
        menu.classList.toggle('hidden');
        activeMenuId = menu.classList.contains('hidden') ? null : id;
    }
}

function createKebabMenu(id, options) {
    if (!options || options.length === 0) return '';
    const btns = options.map(o => `<button onclick="${o.onClick}; toggleMenu(event, '${id}')" class="w-full text-left px-4 py-3 text-sm font-medium ${o.classes}">${o.label}</button>`).join('');
    return `
    <div class="relative inline-block text-left menu-container" onclick="event.stopPropagation()">
        <button onclick="toggleMenu(event, '${id}')" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
        </button>
        <div id="${id}" class="hidden absolute right-0 bottom-full mb-1 md:bottom-auto md:top-full md:mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 z-[60] overflow-hidden border border-slate-100 dark:border-slate-700">
            ${btns}
        </div>
    </div>`;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    // Desktop Pills reset
    document.querySelectorAll('.nav-btn').forEach(el => { 
        el.classList.remove('bg-primary-600', 'text-white', 'shadow-md'); 
        el.classList.add('text-slate-600', 'dark:text-slate-400'); 
    });
    const activeBtn = document.getElementById('nav-' + tabId);
    if (activeBtn) { 
        activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400'); 
        activeBtn.classList.add('bg-primary-600', 'text-white', 'shadow-md'); 
    }

    // Mobile Sidebar reset
    document.querySelectorAll('[id^="mob-nav-"]').forEach(el => { 
        el.classList.remove('bg-primary-600', 'text-white'); 
        el.classList.add('text-slate-600', 'dark:text-slate-400'); 
    });
    const mobActiveBtn = document.getElementById('mob-nav-' + tabId);
    if (mobActiveBtn) { 
        mobActiveBtn.classList.remove('text-slate-600', 'dark:text-slate-400'); 
        mobActiveBtn.classList.add('bg-primary-600', 'text-white'); 
    }

    toggleSidebar(true);
}

// --- MODAL TOGGLES ---
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.classList.remove('opacity-100');
        if (el.children[0]) {
            el.children[0].classList.remove('scale-100', 'translate-y-0');
            el.children[0].classList.add('scale-95', 'translate-y-full', 'md:translate-y-0');
        }
        setTimeout(() => { if (!el.classList.contains('opacity-100')) el.classList.add('hidden'); }, 300);
    });
    document.body.classList.remove('modal-active');
}

function openModal(id) {
    closeAllModals(); // Safely shut others
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    void el.offsetWidth; // Force CSS reflow so animation works instantly
    el.classList.add('opacity-100');
    if (el.children[0]) {
        el.children[0].classList.remove('scale-95', 'translate-y-full');
        el.children[0].classList.add('scale-100', 'translate-y-0');
    }
    document.body.classList.add('modal-active');
}

// Export functions to window to ensure global availability for inline handlers
window.toggleSidebar = toggleSidebar;
window.toggleMenu = toggleMenu;
window.createKebabMenu = createKebabMenu;
window.switchTab = switchTab;
window.closeAllModals = closeAllModals;
window.openModal = openModal;
window.toggleTheme = toggleTheme;
