// file: js/app.js

// 1. REGISTRASI SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then((registration) => console.log('ServiceWorker terdaftar:', registration.scope))
        .catch((error) => console.log('ServiceWorker gagal:', error));
    });
}

// 2. VARIABEL GLOBAL (Bisa diakses dari semua file)
const PX_PER_MM = 3.7795;
let manualZoom = 1;
let halamanAktif = '';
let currentImgSrc = null;
let cropper = null;
let targetRecropElement = null;
let currentImgClassName = 'stretch-off';
let lastZoomRatio = 1;
let defaultZoomRatio = 1;
let currentAlignment = 'flex-start'; // Default rata kiri

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// 3. FUNGSI NAVIGASI HALAMAN
function muatHalaman(fileHtml) {
    fetch(fileHtml)
    .then(response => {
        if (!response.ok) throw new Error("Gagal memuat halaman");
        return response.text();
    })
    .then(html => {
        const mainMenu = document.getElementById('main-menu');
        const header = document.getElementById('header');
        
        if (mainMenu) mainMenu.style.display = 'none';
        if (header) header.style.display = 'none';
        
        document.getElementById('app-container').innerHTML = html;
        
        // Set halaman aktif
        const halamanMap = {
            'pasfoto.html': 'pasfoto', 'grid.html': 'gridkertas',
            'custom.html': 'customfoto', 'hitung.html': 'hitunggambar',
            'polaroid.html': 'polaroid', 'printgambar.html': 'printgambar'
        };
        halamanAktif = halamanMap[fileHtml] || '';
        
        tutupCropModal();
        
        setTimeout(() => {
            if (typeof toggleCustomPaperInput === 'function') toggleCustomPaperInput(halamanAktif);
            if (halamanAktif === 'hitunggambar') {
                if (typeof hitungKapasitasOtomatis === 'function') hitungKapasitasOtomatis();
            } else {
                if (typeof renderUlangKertas === 'function') renderUlangKertas(halamanAktif, getSelectId(halamanAktif));
            }
        }, 50);
        
        // Bind ulang tombol uploader
        document.querySelectorAll('.uploader-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll('.uploader-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                targetRecropElement = null;
                fileInput.click();
            });
        });
    })
    .catch(err => alert("Terjadi kesalahan saat memuat halaman."));
}

function kembaliKeMenu() {
    halamanAktif = '';
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.innerHTML = '';
    
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'grid';
    
    const header = document.getElementById('header');
    if (header) {
        header.style.display = 'flex';
        header.classList.remove('in-subpage');
    }
    
    tutupCropModal();
    if (typeof tutupHeaderMenu === 'function') tutupHeaderMenu();
}

// 4. HELPER & PENGATURAN KERTAS
function getWorkspaceId(pageId) {
    const ids = { 'pasfoto': 'workspacePas', 'gridkertas': 'workspaceGrid', 'customfoto': 'workspaceCustom', 'hitunggambar': 'workspaceCalc', 'polaroid': 'workspacePolaroid', 'printgambar': 'workspaceprintgambar' };
    return ids[pageId] || '';
}

function getSelectId(pageId) {
    const ids = { 'pasfoto': 'paperSize', 'gridkertas': 'gridPaperSize', 'customfoto': 'customPaperSize', 'hitunggambar': 'calcPaperSize', 'polaroid': 'polaroidPaperSize', 'printgambar': 'printgambarPaperSize' };
    return ids[pageId] || '';
}

function getPaperDimensions(pageId, s) {
    const sizes = {
        '3r': { w: 89, h: 127 }, '4r': { w: 102, h: 152 }, '5r': { w: 127, h: 178 },
        '6r': { w: 152, h: 203 }, 'a3': { w: 297, h: 420 }, 'a4': { w: 210, h: 297 },
        'f4': { w: 215, h: 330 }, 'a5': { w: 148, h: 210 }, 'a6': { w: 105, h: 148 }
    };
    if (s === 'custom') {
        const wInput = document.getElementById(`customPaperW_${pageId}`);
        const hInput = document.getElementById(`customPaperH_${pageId}`);
        return { w: (wInput ? parseFloat(wInput.value) * 10 : 200), h: (hInput ? parseFloat(hInput.value) * 10 : 300) };
    }
    return sizes[s] || sizes['3r'];
}

function dapatkanPengaturan() {
    let p = { w_mm: 0, h_mm: 0, gap: 0, margin: 0, qty: 1, mark: false, stretch: false };
    
    if (halamanAktif === 'pasfoto') {
        const ps = document.getElementById('photoSize').value.split('x');
        p.w_mm = parseInt(ps[0]); p.h_mm = parseInt(ps[1]);
        p.gap = parseFloat(document.getElementById('gapInput').value) || 0;
        p.margin = parseFloat(document.getElementById('marginInput').value) || 0;
        p.qty = parseInt(document.getElementById('qtyInput').value) || 1;
        p.mark = document.getElementById('showMarking').checked;
    } else if (halamanAktif === 'gridkertas') {
        const sizeId = document.getElementById('gridPaperSize').value;
        const paperDim = getPaperDimensions('gridkertas', sizeId);
        const cols = parseInt(document.getElementById('gridKolom').value) || 1;
        const rows = parseInt(document.getElementById('gridBaris').value) || 1;
        
        p.gap = parseFloat(document.getElementById('gridGapInput').value) || 0;
        p.margin = parseFloat(document.getElementById('gridMarginInput').value) || 0;
        p.qty = parseInt(document.getElementById('gridQtyInput').value) || 1;
        p.w_mm = (paperDim.w - (2 * p.margin) - ((cols - 1) * p.gap)) / cols;
        p.h_mm = (paperDim.h - (2 * p.margin) - ((rows - 1) * p.gap)) / rows;
        p.mark = document.getElementById('gridShowMarking').checked;
        p.stretch = document.getElementById('gridStretch').checked;
    } else if (halamanAktif === 'customfoto') {
        p.w_mm = (parseFloat(document.getElementById('customLebar').value) || 0) * 10;
        p.h_mm = (parseFloat(document.getElementById('customPanjang').value) || 0) * 10;
        p.gap = parseFloat(document.getElementById('customGapInput').value) || 0;
        p.margin = parseFloat(document.getElementById('customMarginInput').value) || 0;
        p.qty = parseInt(document.getElementById('customQtyInput').value) || 1;
        p.mark = document.getElementById('customShowMarking').checked;
        p.stretch = document.getElementById('customStretch').checked;
    } else if (halamanAktif === 'polaroid') {
        p.w_mm = 70; p.h_mm = 90;
        p.gap = parseFloat(document.getElementById('polaroidGapInput')?.value) || 2;
        p.margin = parseFloat(document.getElementById('polaroidMarginInput')?.value) || 3;
        p.qty = parseInt(document.getElementById('polaroidQtyInput')?.value) || 1;
        p.mark = document.getElementById('polaroidShowMarking')?.checked || false;
    } else if (halamanAktif === 'printgambar') {
        const paperSizeId = document.getElementById('printgambarPaperSize')?.value || '3r';
        const paperDim = getPaperDimensions('printgambar', paperSizeId);
        const isBorderless = document.getElementById('printgambarBorderless')?.checked || false;
        
        p.margin = isBorderless ? 0 : (parseFloat(document.getElementById('printgambarMarginInput')?.value) || 0);
        p.qty = parseInt(document.getElementById('printgambarQtyInput')?.value) || 1;
        p.stretch = true; p.gap = 0; p.mark = false; 
        p.w_mm = Math.max(1, paperDim.w - (2 * p.margin));
        p.h_mm = Math.max(1, paperDim.h - (2 * p.margin));
    }
    return p;
}

// 5. CACHE CLEAR
async function hapusCacheAplikasi() {
    const konfirmasi = confirm("Bersihkan cache dan muat ulang pembaruan terbaru?");
    if (!konfirmasi) return;
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) await reg.unregister();
        }
        localStorage.clear(); sessionStorage.clear();
        alert("Cache bersih! Memuat ulang...");
        window.location.href = window.location.origin + window.location.pathname + '?v=' + new Date().getTime();
    } catch (error) {
        window.location.reload(true);
    }
}

// 6. INIT SAAT PERTAMA LOAD
document.addEventListener("DOMContentLoaded", () => {
    if(typeof tutupCropModal === 'function') tutupCropModal();
    const pageContainer = document.querySelector('.page');
    if (!pageContainer) return;
    halamanAktif = pageContainer.id;
    
    setTimeout(() => {
        if(typeof toggleCustomPaperInput === 'function') toggleCustomPaperInput(halamanAktif);
        if (halamanAktif === 'hitunggambar') {
            if(typeof hitungKapasitasOtomatis === 'function') hitungKapasitasOtomatis();
        } else {
            if(typeof renderUlangKertas === 'function') renderUlangKertas(halamanAktif, getSelectId(halamanAktif));
        }
    }, 150);
});

// Fungsi untuk mengupdate Gap otomatis (2x Margin)
function updateGapOtomatis(pageId) {
    const marginEl = document.getElementById(`${pageId === 'pasfoto' ? '' : pageId}MarginInput`);
    const gapEl = document.getElementById(`${pageId === 'pasfoto' ? '' : pageId}GapInput`);
    
    // Khusus mapping id input jika ada perbedaan penamaan di HTML Anda:
    let marginInputId = 'marginInput';
    let gapInputId = 'gapInput';
    
    if (pageId === 'gridkertas') {
        marginInputId = 'gridMarginInput';
        gapInputId = 'gridGapInput';
    } else if (pageId === 'customfoto') {
        marginInputId = 'customMarginInput';
        gapInputId = 'customGapInput';
    } else if (pageId === 'polaroid') {
        marginInputId = 'polaroidMarginInput';
        gapInputId = 'polaroidGapInput';
    }

    const mInput = document.getElementById(marginInputId);
    const gInput = document.getElementById(gapInputId);

    if (mInput && gInput) {
        const marginVal = parseFloat(mInput.value) || 0;
        // Rumus: Jarak antar gambar = 2 x Margin
        gInput.value = marginVal * 2;
    }

    // Jalankan reflow agar layout kertas langsung update
    if (typeof reflowHalaman === 'function') {
        reflowHalaman();
    }
}