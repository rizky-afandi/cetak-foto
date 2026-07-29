// Konfigurasi PWA Service Worker (Jika digunakan)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Gagal', err));
    });
}

// Global Variables
const PX_PER_MM = 3.7795;
let manualZoom = 1;
let halamanAktif = '';
let currentImgSrc = null;
let cropper = null;
let targetRecropElement = null;

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// INIT HALAMAN
document.addEventListener("DOMContentLoaded", () => {
    const pageContainer = document.querySelector('.page');
    if (!pageContainer) return; // Jika di index.html, hentikan.
    
    halamanAktif = pageContainer.id;
    
    setTimeout(() => {
        toggleCustomPaperInput(halamanAktif);
        if (halamanAktif === 'hitunggambar') {
            hitungKapasitasOtomatis();
        } else {
            renderUlangKertas(halamanAktif, getSelectId(halamanAktif));
        }
    }, 150);

    // Bind Upload Buttons
    document.querySelectorAll('.uploader-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            targetRecropElement = null;
            fileInput.click();
        });
    });
});

// UPLOAD & CROP
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    // Gunakan ObjectURL untuk hemat RAM
    const imgURL = URL.createObjectURL(file);
    const cropImgEl = document.getElementById('cropImage');
    
    cropImgEl.src = imgURL;
    document.getElementById('cropModal').classList.add('active');
    
    cropImgEl.onload = () => {
        if (cropper) cropper.destroy();
        
        let p = dapatkanPengaturan();
        let cropperRatio = NaN;
        if (!p.stretch && p.w_mm > 0 && p.h_mm > 0) {
            cropperRatio = p.w_mm / p.h_mm;
        }
        
        cropper = new Cropper(cropImgEl, {
            viewMode: 1,
            autoCropArea: 1,
            aspectRatio: cropperRatio,
            responsive: true,
            restore: false
        });
    };
    fileInput.value = ""; 
});

function terapkanCrop() {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({ imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
    if (!canvas) return;
    
    const newSrc = canvas.toDataURL('image/jpeg', 1.0); // Resolusi tinggi
    
    if (targetRecropElement) {
        let imgEl = targetRecropElement.querySelector('img');
        if(imgEl) imgEl.src = newSrc;
        targetRecropElement = null;
        updateLayoutRealtime();
    } else {
        currentImgSrc = newSrc;
    }
    
    cropper.destroy();
    cropper = null;
    document.getElementById('cropModal').classList.remove('active');
}

function batalCrop() {
    targetRecropElement = null;
    if(cropper) { cropper.destroy(); cropper = null; }
    document.getElementById('cropModal').classList.remove('active');
}

// UTILS & PENGATURAN
function getWorkspaceId(pageId) {
    if(pageId === 'pasfoto') return 'workspacePas';
    if(pageId === 'gridkertas') return 'workspaceGrid';
    if(pageId === 'customfoto') return 'workspaceCustom';
    if(pageId === 'hitunggambar') return 'workspaceCalc';
    return '';
}

function getSelectId(pageId) {
    if(pageId === 'pasfoto') return 'paperSize';
    if(pageId === 'gridkertas') return 'gridPaperSize';
    if(pageId === 'customfoto') return 'customPaperSize';
    if(pageId === 'hitunggambar') return 'calcPaperSize';
    return '';
}

function toggleCustomPaperInput(pageId) {
    const selectEl = document.getElementById(getSelectId(pageId));
    const groupEl = document.getElementById(`groupCustomPaper_${pageId}`);
    if (selectEl && groupEl) {
        groupEl.style.display = (selectEl.value === 'custom') ? 'flex' : 'none';
    }
}

function getPaperDimensions(pageId, s) {
    const sizes = {'3r':{w:89,h:127},'4r':{w:102,h:152},'5r':{w:127,h:178},'6r':{w:152,h:203},'a4':{w:210,h:297},'a5':{w:148,h:210},'a6':{w:105,h:148}};
    if (s === 'custom') {
        const wInput = document.getElementById(`customPaperW_${pageId}`);
        const hInput = document.getElementById(`customPaperH_${pageId}`);
        return { w: (wInput ? parseFloat(wInput.value) * 10 : 200), h: (hInput ? parseFloat(hInput.value) * 10 : 300) };
    }
    return sizes[s] || sizes['a4'];
}

function dapatkanPengaturan() {
    let p = { w_mm: 0, h_mm: 0, gap: 0, margin: 0, qty: 1, mark: false, stretch: false };
    if(halamanAktif === 'pasfoto') {
        const ps = document.getElementById('photoSize').value.split('x');
        p.w_mm = parseInt(ps[0]); p.h_mm = parseInt(ps[1]);
        p.gap = parseFloat(document.getElementById('gapInput').value) || 0;
        p.margin = parseFloat(document.getElementById('marginInput').value) || 0;
        p.qty = parseInt(document.getElementById('qtyInput').value) || 1;
        p.mark = document.getElementById('showMarking').checked;
    } else if(halamanAktif === 'gridkertas') {
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
    } else if(halamanAktif === 'customfoto') {
        p.w_mm = (parseFloat(document.getElementById('customLebar').value) || 0) * 10;
        p.h_mm = (parseFloat(document.getElementById('customPanjang').value) || 0) * 10;
        p.gap = parseFloat(document.getElementById('customGapInput').value) || 0;
        p.margin = parseFloat(document.getElementById('customMarginInput').value) || 0;
        p.qty = parseInt(document.getElementById('customQtyInput').value) || 1;
        p.mark = document.getElementById('customShowMarking').checked;
        p.stretch = document.getElementById('customStretch').checked;
    }
    return p;
}

// ZOOM
function ubahZoom(d) { manualZoom = Math.max(0.3, Math.min(4, manualZoom + d)); terapkanZoom(); }
function resetZoom() { manualZoom = 1; terapkanZoom(); }
function terapkanZoom() {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (!workspace) return;
    const wrapper = workspace.closest('.workspace-container').querySelector('.paper-wrapper');
    const containers = workspace.querySelectorAll('.page-container');
    if (containers.length === 0) return;
    
    const origW = parseFloat(containers[0].dataset.w);
    const origH = parseFloat(containers[0].dataset.h);
    const availW = wrapper.clientWidth - 40;
    const availH = wrapper.clientHeight - 40;
    
    let autoFitScale = Math.min(availW / origW, availH / origH);
    const finalScale = autoFitScale * manualZoom;
    
    containers.forEach(cont => {
        cont.style.width = `${origW * finalScale}px`;
        cont.style.height = `${origH * finalScale}px`;
        const paper = cont.querySelector('.paper-page');
        if(paper) paper.style.transform = `scale(${finalScale})`;
    });
}
window.addEventListener('resize', () => { if(halamanAktif !== '') terapkanZoom(); });

// RENDER & REFLOW KERTAS
function renderUlangKertas(pageId, selectId) {
    manualZoom = 1;
    let workspace = document.getElementById(getWorkspaceId(pageId));
    if(!workspace) return;
    
    let existingImages = [];
    workspace.querySelectorAll('.photo-item').forEach(item => {
        let img = item.querySelector('img');
        if(img) existingImages.push({ src: img.src, className: img.className, w: item.style.width, h: item.style.height });
    });
    
    workspace.innerHTML = ''; 
    const paperDim = getPaperDimensions(pageId, document.getElementById(selectId).value);
    tambahHalamanKertas(getWorkspaceId(pageId), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
    
    if (existingImages.length > 0) susunUlangGambar(existingImages, getWorkspaceId(pageId), pageId);
    updateLayoutRealtime(); 
}

function reflowHalaman() {
    if (!halamanAktif || halamanAktif === 'hitunggambar') return;
    
    // Sinkronkan gap input khusus grid
    if (halamanAktif === 'gridkertas') {
        const marginInput = document.getElementById('gridMarginInput');
        const gapInput = document.getElementById('gridGapInput');
        if (marginInput && gapInput) gapInput.value = parseFloat(marginInput.value) * 2;
    }
    
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if(!workspace) return;
    let p = dapatkanPengaturan();
    let existingImages = [];
    
    workspace.querySelectorAll('.photo-item').forEach(item => {
        let img = item.querySelector('img');
        if(img) existingImages.push({ src: img.src, className: (halamanAktif !== 'pasfoto' ? (p.stretch ? 'stretch-on' : 'stretch-off') : img.className), w: item.style.width, h: item.style.height });
    });
    
    workspace.innerHTML = ''; 
    const paperDim = getPaperDimensions(halamanAktif, document.getElementById(getSelectId(halamanAktif)).value);
    tambahHalamanKertas(getWorkspaceId(halamanAktif), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
    
    if (existingImages.length > 0) susunUlangGambar(existingImages, getWorkspaceId(halamanAktif), halamanAktif);
    updateLayoutRealtime(); 
}

function tambahHalamanKertas(workspaceId, wPx, hPx) {
    const workspace = document.getElementById(workspaceId);
    let container = document.createElement('div');
    container.className = 'page-container';
    container.dataset.w = wPx; container.dataset.h = hPx;
    
    let pageEl = document.createElement('div');
    pageEl.className = 'paper-page';
    pageEl.style.width = `${wPx}px`; pageEl.style.height = `${hPx}px`;
    
    // Drag & Drop
    pageEl.addEventListener('dragover', e => e.preventDefault());
    pageEl.addEventListener('drop', e => {
        e.preventDefault();
        const draggedSrcId = e.dataTransfer.getData('text/plain');
        const draggedEl = document.getElementById(draggedSrcId);
        if (draggedEl) {
            const afterElement = getDragAfterElement(pageEl, e.clientY);
            if (afterElement == null) pageEl.appendChild(draggedEl);
            else pageEl.insertBefore(draggedEl, afterElement);
            reflowHalaman(); 
        }
    });
    
    container.appendChild(pageEl);
    workspace.appendChild(container);
    return pageEl;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.photo-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function susunUlangGambar(images, targetWorkspaceId, pageId) {
    let workspace = document.getElementById(targetWorkspaceId);
    let p = dapatkanPengaturan();
    const paperDim = getPaperDimensions(pageId, document.getElementById(getSelectId(pageId)).value);
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && pageId !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    let pages = workspace.querySelectorAll('.paper-page');
    pages.forEach(pEl => { pEl.style.padding = `${padPx}px`; pEl.style.gap = `${p.gap * PX_PER_MM}px`; pEl.style.transform = 'none'; });
    
    for(let i=0; i<images.length; i++) {
        let lastPage = pages[pages.length - 1];
        let div = buatElemenFoto(images[i].src, images[i].w, images[i].h, images[i].className);
        lastPage.appendChild(div);
        
        if (lastPage.scrollHeight > lastPage.clientHeight + 2 || lastPage.scrollWidth > lastPage.clientWidth + 2) {
            lastPage.removeChild(div);
            lastPage = tambahHalamanKertas(targetWorkspaceId, paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
            pages = workspace.querySelectorAll('.paper-page');
            lastPage.style.padding = `${padPx}px`; lastPage.style.gap = `${p.gap * PX_PER_MM}px`; lastPage.style.transform = 'none';
            if (p.mark && pageId !== 'gridkertas') lastPage.classList.add('show-marks');
            lastPage.appendChild(div);
        }
    }
}

function buatElemenFoto(imgSrc, widthPx, heightPx, imgClassName) {
    let div = document.createElement('div');
    div.className = 'photo-item';
    div.id = 'photo_' + Math.random().toString(36).substr(2, 9);
    div.style.width = widthPx; div.style.height = heightPx;
    div.draggable = true;
    
    div.addEventListener('dragstart', (e) => { div.classList.add('dragging'); e.dataTransfer.setData('text/plain', div.id); });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); reflowHalaman(); });
    
    let img = document.createElement('img');
    img.src = imgSrc; img.className = imgClassName;
    div.appendChild(img);
    
    // Actions (Hapus, Copy, Putar, Crop)
    let actionsDiv = document.createElement('div');
    actionsDiv.className = 'photo-actions';
    
    const createBtn = (icon, title, onClick) => {
        let btn = document.createElement('button'); btn.className = 'photo-action-btn';
        btn.innerHTML = icon; btn.title = title;
        btn.onclick = (e) => { e.stopPropagation(); onClick(); };
        return btn;
    };
    
    actionsDiv.appendChild(createBtn('🗑️', 'Hapus', () => { div.remove(); reflowHalaman(); }));
    actionsDiv.appendChild(createBtn('📋', 'Kopi', () => { div.after(buatElemenFoto(img.src, div.style.width, div.style.height, img.className)); reflowHalaman(); }));
    actionsDiv.appendChild(createBtn('🔄', 'Putar 90°', () => {
        let tempImg = new Image(); tempImg.src = img.src;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = tempImg.height; canvas.height = tempImg.width;
            const ctx = canvas.getContext('2d'); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            img.src = canvas.toDataURL('image/jpeg', 1.0);
            let cw = div.style.width; div.style.width = div.style.height; div.style.height = cw;
            reflowHalaman();
        };
    }));
    actionsDiv.appendChild(createBtn('✂️', 'Crop Ulang', () => {
        targetRecropElement = div;
        document.getElementById('cropImage').src = img.src;
        document.getElementById('cropModal').classList.add('active');
        let p = dapatkanPengaturan();
        if(cropper) cropper.destroy();
        cropper = new Cropper(document.getElementById('cropImage'), { viewMode: 1, autoCropArea: 1, aspectRatio: (!p.stretch ? (p.w_mm / p.h_mm) : NaN) });
    }));
    
    div.appendChild(actionsDiv);
    
    // Siku L khusus Pas Foto & Custom
    if (halamanAktif !== 'gridkertas') {
        div.insertAdjacentHTML('beforeend', `<div class="crop-mark mark-tl"></div><div class="crop-mark mark-tr"></div><div class="crop-mark mark-bl"></div><div class="crop-mark mark-br"></div>`);
    }
    return div;
}

// UPDATE LAYOUT & MARKING (GARIS SIKU L DAN GARIS LURUS GRID)
function updateLayoutRealtime() {
    if(!halamanAktif || halamanAktif === 'hitunggambar') return;
    
    let p = dapatkanPengaturan();
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if(!workspace) return;
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && halamanAktif !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    workspace.style.setProperty('--mark-offset', `-${(p.gap / 2) * PX_PER_MM}px`); // Kompensasi Garis Siku
    
    if (halamanAktif === 'gridkertas') {
        workspace.querySelectorAll('.photo-item').forEach(item => {
            item.style.width = `${p.w_mm * PX_PER_MM}px`; item.style.height = `${p.h_mm * PX_PER_MM}px`;
        });
    }
    
    workspace.querySelectorAll('.paper-page').forEach(page => {
        page.style.padding = `${padPx}px`;
        page.style.gap = `${p.gap * PX_PER_MM}px`;
        
        // Mode Siku L
        if (p.mark && halamanAktif !== 'gridkertas') page.classList.add('show-marks');
        else page.classList.remove('show-marks');
        
        // Bersihkan Garis Grid Lama
        page.querySelectorAll('.grid-mark-overlay').forEach(el => el.remove());
        
        // Mode Garis Lurus (Hanya Grid)
        if (halamanAktif === 'gridkertas' && p.mark) {
            let items = page.querySelectorAll('.photo-item');
            if (items.length > 0) {
                let cols = parseInt(document.getElementById('gridKolom').value) || 1;
                let actualCols = Math.min(items.length, cols);
                let actualRows = Math.ceil(items.length / cols);
                let itemWPx = p.w_mm * PX_PER_MM, itemHPx = p.h_mm * PX_PER_MM, gapPx = p.gap * PX_PER_MM;
                let gridWidth = actualCols * itemWPx + (actualCols - 1) * gapPx;
                let gridHeight = actualRows * itemHPx + (actualRows - 1) * gapPx;
                let markLengthPx = 2 * PX_PER_MM;
                
                // Vertikal (Tengah antar kolom)
                for (let c = 1; c < actualCols; c++) {
                    let x = padPx + c * itemWPx + (c - 0.5) * gapPx;
                    let mTop = document.createElement('div'); mTop.className = 'grid-mark-overlay';
                    mTop.style.cssText = `width: 0.5px; height: 2mm; left: ${x}px; top: ${padPx}px; transform: translateX(-50%);`;
                    let mBot = document.createElement('div'); mBot.className = 'grid-mark-overlay';
                    mBot.style.cssText = `width: 0.5px; height: 2mm; left: ${x}px; top: ${padPx + gridHeight - markLengthPx}px; transform: translateX(-50%);`;
                    page.appendChild(mTop); page.appendChild(mBot);
                }
                // Horizontal (Tengah antar baris)
                for (let r = 1; r < actualRows; r++) {
                    let y = padPx + r * itemHPx + (r - 0.5) * gapPx;
                    let mLft = document.createElement('div'); mLft.className = 'grid-mark-overlay';
                    mLft.style.cssText = `width: 2mm; height: 0.5px; top: ${y}px; left: ${padPx}px; transform: translateY(-50%);`;
                    let mRgt = document.createElement('div'); mRgt.className = 'grid-mark-overlay';
                    mRgt.style.cssText = `width: 2mm; height: 0.5px; top: ${y}px; left: ${padPx + gridWidth - markLengthPx}px; transform: translateY(-50%);`;
                    page.appendChild(mLft); page.appendChild(mRgt);
                }
            }
        }
    });
    terapkanZoom();
}

// AKSI TOMBOL
function aksiTambah() {
    if(!currentImgSrc) { alert('Silakan upload dan crop foto terlebih dahulu!'); return; }
    let p = dapatkanPengaturan();
    let isRotate90 = (halamanAktif === 'pasfoto' && document.getElementById('rotate90Check')?.checked);
    
    if (isRotate90) {
        let tempImg = new Image(); tempImg.src = currentImgSrc;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = tempImg.height; canvas.height = tempImg.width;
            const ctx = canvas.getContext('2d'); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            masukkanKeHalamanKertas(canvas.toDataURL('image/jpeg', 1.0), p.h_mm, p.w_mm, p.qty, false);
        };
    } else {
        masukkanKeHalamanKertas(currentImgSrc, p.w_mm, p.h_mm, p.qty, false);
    }
}

function aksiOtomatis() {
    if(!currentImgSrc) { alert('Silakan upload dan crop foto terlebih dahulu!'); return; }
    let p = dapatkanPengaturan();
    let isRotate90 = (halamanAktif === 'pasfoto' && document.getElementById('rotate90Check')?.checked);
    
    if (isRotate90) {
        let tempImg = new Image(); tempImg.src = currentImgSrc;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = tempImg.height; canvas.height = tempImg.width;
            const ctx = canvas.getContext('2d'); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            masukkanKeHalamanKertas(canvas.toDataURL('image/jpeg', 1.0), p.h_mm, p.w_mm, 999, true);
        };
    } else {
        masukkanKeHalamanKertas(currentImgSrc, p.w_mm, p.h_mm, 999, true);
    }
}

function masukkanKeHalamanKertas(imgSrc, w_mm, h_mm, qty, autoFill) {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    let p = dapatkanPengaturan();
    const paperDim = getPaperDimensions(halamanAktif, document.getElementById(getSelectId(halamanAktif)).value);
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && halamanAktif !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    let pages = workspace.querySelectorAll('.paper-page');
    pages.forEach(pEl => { pEl.style.padding = `${padPx}px`; pEl.style.gap = `${p.gap * PX_PER_MM}px`; pEl.style.transform = 'none'; });
    
    let limit = autoFill ? 999 : qty, itemsAdded = 0, newPageForAutoFill = false;
    
    for(let i=0; i<limit; i++) {
        let lastPage = pages[pages.length - 1];
        let div = buatElemenFoto(imgSrc, `${w_mm * PX_PER_MM}px`, `${h_mm * PX_PER_MM}px`, p.stretch ? 'stretch-on' : 'stretch-off');
        lastPage.appendChild(div);
        
        if (lastPage.scrollHeight > lastPage.clientHeight + 2 || lastPage.scrollWidth > lastPage.clientWidth + 2) {
            lastPage.removeChild(div);
            if (autoFill) {
                if (itemsAdded === 0 && !newPageForAutoFill) {
                    lastPage = tambahHalamanKertas(getWorkspaceId(halamanAktif), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
                    pages = workspace.querySelectorAll('.paper-page');
                    newPageForAutoFill = true; i--; continue;
                } else break;
            } else {
                lastPage = tambahHalamanKertas(getWorkspaceId(halamanAktif), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
                pages = workspace.querySelectorAll('.paper-page');
                lastPage.appendChild(div);
            }
        }
        itemsAdded++;
    }
    updateLayoutRealtime();
}

function aksiResetForm(pageId) {
    let workspace = document.getElementById(getWorkspaceId(pageId));
    if (workspace) workspace.innerHTML = '';
    
    if(pageId === 'pasfoto') {
        document.getElementById('paperSize').value = '3r'; document.getElementById('photoSize').value = '20x28';
        document.getElementById('rotate90Check').checked = false; document.getElementById('gapInput').value = '2';
        document.getElementById('marginInput').value = '3'; document.getElementById('qtyInput').value = '1'; document.getElementById('showMarking').checked = false;
    } else if(pageId === 'gridkertas') {
        document.getElementById('gridPaperSize').value = 'a4'; document.getElementById('gridKolom').value = '1';
        document.getElementById('gridBaris').value = '2'; document.getElementById('gridStretch').checked = false;
        document.getElementById('gridGapInput').value = '6'; document.getElementById('gridMarginInput').value = '3';
        document.getElementById('gridQtyInput').value = '1'; document.getElementById('gridShowMarking').checked = false;
    } else if(pageId === 'customfoto') {
        document.getElementById('customPaperSize').value = '3r'; document.getElementById('customPanjang').value = '10';
        document.getElementById('customLebar').value = '10'; document.getElementById('customStretch').checked = false;
        document.getElementById('customGapInput').value = '2'; document.getElementById('customMarginInput').value = '3';
        document.getElementById('customQtyInput').value = '1'; document.getElementById('customShowMarking').checked = false;
    }
    toggleCustomPaperInput(pageId); renderUlangKertas(pageId, getSelectId(pageId));
    currentImgSrc = null;
}

function aksiRata(align) {
    document.getElementById(getWorkspaceId(halamanAktif)).querySelectorAll('.paper-page').forEach(p => p.style.justifyContent = align);
    tutupSemuaMenu();
}

// EXPORT PDF, JPEG, PRINT
function toggleExportMenu(event, menuId) {
    event.stopPropagation();
    ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => {
        if(id === menuId) document.getElementById(id).classList.toggle('show');
        else document.getElementById(id)?.classList.remove('show');
    });
}

function tutupSemuaMenu() {
    ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => document.getElementById(id)?.classList.remove('show'));
}
window.addEventListener('click', tutupSemuaMenu);

async function aksiExport(tipe) {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    let pages = workspace.querySelectorAll('.paper-page');
    if(pages.length === 0) return;
    tutupSemuaMenu();
    
    if (tipe === 'Print') {
        const printWindow = window.open('', '_blank');
        let pagesHtml = '';
        pages.forEach(p => pagesHtml += `<div class="paper-page ${p.classList.contains('show-marks')?'show-marks':''}" style="${p.style.cssText}; transform: none !important; position: relative !important; margin: 0 auto 20px auto; page-break-after: always; box-shadow: none;">${p.innerHTML}</div>`);
        printWindow.document.write(`<html><head><title>Print Preview</title><style>@page { margin: 0; } body { margin: 0; background: #fff; } ${document.querySelector('style')?.innerHTML || ''} .photo-actions { display: none !important; }</style></head><body><div class="workspace" style="--mark-offset: ${workspace.style.getPropertyValue('--mark-offset')}">${pagesHtml}</div><script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script></body></html>`);
        printWindow.document.close();
    } else {
        let pdf = null;
        const renderScale = 5; // HIGH QUALITY
        for (let i = 0; i < pages.length; i++) {
            const paperEl = pages[i];
            const prevTransform = paperEl.style.transform;
            paperEl.style.transform = 'none'; 
            paperEl.querySelectorAll('.photo-actions').forEach(el => el.style.display = 'none');
            
            const canvas = await html2canvas(paperEl, { scale: renderScale, useCORS: true, backgroundColor: '#ffffff', logging: false });
            
            paperEl.querySelectorAll('.photo-actions').forEach(el => el.style.display = '');
            paperEl.style.transform = prevTransform; 
            
            if (tipe === 'JPEG') {
                await new Promise(resolve => {
                    canvas.toBlob(blob => {
                        const link = document.createElement('a'); link.download = `CetakFoto_Hal-${i+1}.jpeg`;
                        link.href = URL.createObjectURL(blob); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); resolve(); }, 300);
                    }, 'image/jpeg', 1.0);
                });
            } else if (tipe === 'PDF') {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const isLandscape = canvas.width > canvas.height;
                if (i === 0) pdf = new window.jspdf.jsPDF({ orientation: isLandscape ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height], compress: true });
                else pdf.addPage([canvas.width, canvas.height], isLandscape ? 'l' : 'p');
                pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
            }
        }
        if (tipe === 'PDF' && pdf) pdf.save(`CetakFoto_${new Date().getTime()}.pdf`);
    }
}

// FUNGSI HITUNG GAMBAR (Hybrid Layout)
function hitungKapasitasOtomatis() {
    if (halamanAktif !== 'hitunggambar') return;
    const paperDim = getPaperDimensions('hitunggambar', document.getElementById('calcPaperSize').value);
    const fotoW = (parseFloat(document.getElementById('calcFotoW').value) || 0) * 10;
    const fotoH = (parseFloat(document.getElementById('calcFotoH').value) || 0) * 10;
    const gap = parseFloat(document.getElementById('calcGap').value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin').value) || 0;
    const shape = document.getElementById('calcShape').value;
    
    if (fotoW <= 0 || fotoH <= 0) { document.getElementById('resultCount').textContent = "0 Foto"; return; }
    const effW = paperDim.w - (2 * margin), effH = paperDim.h - (2 * margin);
    if (effW <= 0 || effH <= 0) { document.getElementById('resultCount').textContent = "0 Foto"; return; }
    
    // Opsi A: Utama Normal
    const colsA = Math.floor((effW + gap) / (fotoW + gap)), rowsA = Math.floor((effH + gap) / (fotoH + gap));
    const totalA_main = Math.max(0, colsA) * Math.max(0, rowsA);
    const sisaH_A = effH - (rowsA * fotoH + (rowsA > 0 ? (rowsA - 1) * gap : 0)) - (rowsA > 0 ? gap : 0);
    let totalA_extra = 0, colsA_e = 0, rowsA_e = 0;
    if (sisaH_A >= fotoW && totalA_main > 0) { colsA_e = Math.floor((effW + gap)/(fotoH + gap)); rowsA_e = Math.floor((sisaH_A + gap)/(fotoW + gap)); totalA_extra = Math.max(0, colsA_e) * Math.max(0, rowsA_e); }
    const totalA = totalA_main + totalA_extra;
    
    // Opsi B: Utama Diputar
    const colsB = Math.floor((effW + gap) / (fotoH + gap)), rowsB = Math.floor((effH + gap) / (fotoW + gap));
    const totalB_main = Math.max(0, colsB) * Math.max(0, rowsB);
    const sisaH_B = effH - (rowsB * fotoW + (rowsB > 0 ? (rowsB - 1) * gap : 0)) - (rowsB > 0 ? gap : 0);
    let totalB_extra = 0, colsB_e = 0, rowsB_e = 0;
    if (sisaH_B >= fotoH && totalB_main > 0) { colsB_e = Math.floor((effW + gap)/(fotoW + gap)); rowsB_e = Math.floor((sisaH_B + gap)/(fotoH + gap)); totalB_extra = Math.max(0, colsB_e) * Math.max(0, rowsB_e); }
    const totalB = totalB_main + totalB_extra;
    
    let L = totalA >= totalB ? { t: totalA, mc: totalA_main, mw: fotoW, mh: fotoH, ec: totalA_extra, ew: fotoH, eh: fotoW } : { t: totalB, mc: totalB_main, mw: fotoH, mh: fotoW, ec: totalB_extra, ew: fotoW, eh: fotoH };
    
    document.getElementById('resultCount').textContent = `${L.t} Foto`;
    document.getElementById('resultDetail').textContent = L.ec > 0 ? `${L.mc} Foto Utama + ${L.ec} Sisa` : `${L.mc} Foto Terisi`;
    renderSimulasiVisualCalc(paperDim.w, paperDim.h, margin, gap, shape, L);
}

function renderSimulasiVisualCalc(pW, pH, margin, gap, shape, L) {
    const workspace = document.getElementById('workspaceCalc');
    workspace.innerHTML = '';
    let cont = document.createElement('div'); cont.className = 'page-container'; cont.dataset.w = pW * PX_PER_MM; cont.dataset.h = pH * PX_PER_MM;
    let page = document.createElement('div'); page.className = 'paper-page';
    page.style.width = `${pW * PX_PER_MM}px`; page.style.height = `${pH * PX_PER_MM}px`; page.style.padding = `${margin * PX_PER_MM}px`;
    page.style.display = 'flex'; page.style.flexWrap = 'wrap'; page.style.alignContent = 'flex-start'; page.style.gap = `${gap * PX_PER_MM}px`;
    
    let counter = 1;
    for (let i = 0; i < L.mc; i++) page.appendChild(buatBoxVisualCalc(L.mw, L.mh, shape, counter++, '#E9D5FF', '#9333ea'));
    for (let j = 0; j < L.ec; j++) page.appendChild(buatBoxVisualCalc(L.ew, L.eh, shape, counter++, '#FED7AA', '#ea580c'));
    
    cont.appendChild(page); workspace.appendChild(cont); terapkanZoom();
}

function buatBoxVisualCalc(w, h, shape, num, bg, border) {
    let box = document.createElement('div'); box.style.width = `${w * PX_PER_MM}px`; box.style.height = `${h * PX_PER_MM}px`;
    box.style.background = bg; box.style.border = `1px solid ${border}`; box.style.display = 'flex'; box.style.alignItems = 'center'; box.style.justifyContent = 'center'; box.style.color = border; box.style.fontWeight = 'bold';
    box.textContent = num; box.style.borderRadius = (shape === 'circle') ? '50%' : '4px'; return box;
}