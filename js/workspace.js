// file: js/workspace.js

function toggleCustomPaperInput(pageId) {
    const selectEl = document.getElementById(getSelectId(pageId));
    const groupEl = document.getElementById(`groupCustomPaper_${pageId}`);
    if (selectEl && groupEl) groupEl.style.display = (selectEl.value === 'custom') ? 'flex' : 'none';
}

function toggleBorderlessPrintgambar() {
    const isBorderless = document.getElementById('printgambarBorderless')?.checked;
    const marginInput = document.getElementById('printgambarMarginInput');
    if (marginInput) {
        if (isBorderless) { marginInput.dataset.prevValue = marginInput.value; marginInput.value = 0; marginInput.disabled = true; } 
        else { marginInput.value = marginInput.dataset.prevValue || 3; marginInput.disabled = false; }
    }
    reflowHalaman();
}

// ZOOM
function ubahZoom(d) { manualZoom = Math.max(0.3, Math.min(4, manualZoom + d)); terapkanZoom(); }
function resetZoom() { manualZoom = 1; terapkanZoom(); }
function terapkanZoom() {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif)); if (!workspace) return;
    const wrapper = workspace.closest('.workspace-container')?.querySelector('.paper-wrapper') || workspace.parentElement;
    const containers = workspace.querySelectorAll('.page-container'); if (containers.length === 0) return;
    
    const origW = parseFloat(containers[0].dataset.w), origH = parseFloat(containers[0].dataset.h);
    const availW = wrapper.clientWidth - 40, availH = wrapper.clientHeight - 40;
    const finalScale = Math.min(availW / origW, availH / origH) * manualZoom;
    
    containers.forEach(cont => {
        cont.style.width = `${origW * finalScale}px`; cont.style.height = `${origH * finalScale}px`;
        const paper = cont.querySelector('.paper-page'); if(paper) paper.style.transform = `scale(${finalScale})`;
    });
}
window.addEventListener('resize', () => { if(halamanAktif !== '') terapkanZoom(); });

// FUNGSI INTI WORKSPACE (Tambah Halaman, Elemen Foto, Susun Gambar)
function tambahHalamanKertas(workspaceId, wPx, hPx) {
    const workspace = document.getElementById(workspaceId);
    let container = document.createElement('div'); 
    container.className = 'page-container'; 
    container.dataset.w = wPx; 
    container.dataset.h = hPx;
    
    let pageEl = document.createElement('div'); 
    pageEl.className = 'paper-page'; 
    pageEl.style.width = `${wPx}px`; 
    pageEl.style.height = `${hPx}px`;
    
    // PERBAIKAN: Gunakan nilai alignment yang sedang aktif (misal 'center' jika pilih rata tengah)
    pageEl.style.justifyContent = currentAlignment || 'flex-start';
    
    // Event listener Drag & Drop bawaan Anda...
    pageEl.addEventListener('dragover', e => e.preventDefault());
    pageEl.addEventListener('drop', e => {
        e.preventDefault();
        const draggedEl = document.getElementById(e.dataTransfer.getData('text/plain'));
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
        const box = child.getBoundingClientRect(), offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function susunUlangGambar(images, targetWorkspaceId, pageId) {
    let workspace = document.getElementById(targetWorkspaceId);
    if (!workspace) return;
    
    let p = dapatkanPengaturan();
    const selEl = document.getElementById(getSelectId(pageId));
    const paperDim = getPaperDimensions(pageId, selEl ? selEl.value : 'a4');
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && pageId !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    let pages = workspace.querySelectorAll('.paper-page');
    pages.forEach(pEl => { 
        pEl.style.padding = `${padPx}px`; 
        pEl.style.gap = `${p.gap * PX_PER_MM}px`; 
        pEl.style.transform = 'none'; 
    });
    
    for (let i = 0; i < images.length; i++) {
        let lastPage = pages[pages.length - 1];
        let imgObj = images[i];
        
        // PERBAIKAN UTAMA:
        // Gunakan ukuran mm mandiri milik imgObj (bukan p.w_mm/p.h_mm form)
        let w_mm_foto = imgObj.w_mm;
        let h_mm_foto = imgObj.h_mm;
        let wPx_foto = `${(w_mm_foto - 0.2) * PX_PER_MM}px`;
        let hPx_foto = `${(h_mm_foto - 0.2) * PX_PER_MM}px`;
        
        // Buat elemen foto baru murni membawa ukuran mandiri gambar ini saja
        let div = buatElemenFoto(
            imgObj.src, 
            wPx_foto, 
            hPx_foto, 
            imgObj.className, 
            w_mm_foto, 
            h_mm_foto
        );
        
        // Pertahankan status rotasi mandiri
        if (imgObj.isRotated) {
            div.dataset.rotated = "true";
        }
        
        lastPage.appendChild(div);
        
        let scrollTolerance = (pageId === 'printgambar') ? 12 : 2;
        if (lastPage.scrollHeight > lastPage.clientHeight + scrollTolerance || lastPage.scrollWidth > lastPage.clientWidth + scrollTolerance) {
            lastPage.removeChild(div);
            lastPage = tambahHalamanKertas(targetWorkspaceId, paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
            pages = workspace.querySelectorAll('.paper-page');
            lastPage.style.padding = `${padPx}px`; 
            lastPage.style.gap = `${p.gap * PX_PER_MM}px`; 
            lastPage.style.transform = 'none';
            if (p.mark && pageId !== 'gridkertas') lastPage.classList.add('show-marks');
            lastPage.appendChild(div);
        }
    }
}

function buatElemenFoto(imgSrc, widthPx, heightPx, imgClassName, w_mm, h_mm) {
    let div = document.createElement('div');
    div.className = 'photo-item';
    div.id = 'photo_' + Math.random().toString(36).substr(2, 9);
    div.style.width = widthPx; 
    div.style.height = heightPx;
    div.draggable = true;
    
    // Simpan ukuran asli foto dalam mm ke dataset
    div.dataset.w_mm = w_mm;
    div.dataset.h_mm = h_mm;
    
    div.addEventListener('dragstart', (e) => { 
        div.classList.add('dragging'); 
        e.dataTransfer.setData('text/plain', div.id); 
    });
    div.addEventListener('dragend', () => { 
        div.classList.remove('dragging'); 
        reflowHalaman(); 
    });
    
    let img = document.createElement('img');
    img.src = imgSrc; 
    img.className = imgClassName;
    div.appendChild(img);
    
    let actionsDiv = document.createElement('div');
    actionsDiv.className = 'photo-actions';
    
    const createBtn = (icon, title, onClick) => {
        let btn = document.createElement('button'); 
        btn.className = 'photo-action-btn';
        btn.innerHTML = icon; 
        btn.title = title;
        btn.onclick = (e) => { e.stopPropagation(); onClick(); };
        return btn;
    };
    
    // 1. Tombol Hapus
    actionsDiv.appendChild(createBtn('🗑️', 'Hapus', () => { 
        div.remove(); 
        reflowHalaman(); 
    }));
    
    // 2. Tombol Kopi
    actionsDiv.appendChild(createBtn('📋', 'Kopi', () => { 
        let copyDiv = buatElemenFoto(img.src, div.style.width, div.style.height, img.className, div.dataset.w_mm, div.dataset.h_mm);
        if (div.dataset.rotated === "true") copyDiv.dataset.rotated = "true";
        div.after(copyDiv); 
        reflowHalaman(); 
    }));
    
    // 3. TOMBOL PUTAR 90° (DAPAT DIGUNAKAN DI SEMUA HALAMAN)
    actionsDiv.appendChild(createBtn('🔄', 'Putar 90°', () => {
        let tempImg = new Image();
        tempImg.src = img.src; 
        
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.height;
            canvas.height = tempImg.width;
            
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            
            // 1. Ganti gambar (src) dengan versi hasil putaran
            const rotatedSrc = canvas.toDataURL('image/jpeg', 0.95);
            img.src = rotatedSrc;
            
            // 2. Tukar ukuran dataset fisik mm (Lebar <-> Tinggi)
            let currentW = parseFloat(div.dataset.w_mm) || 0;
            let currentH = parseFloat(div.dataset.h_mm) || 0;
            
            if (currentW > 0 && currentH > 0) {
                div.dataset.w_mm = currentH;
                div.dataset.h_mm = currentW;
                
                // Ubah dimensi elemen div foto di DOM
                div.style.width = `${(currentH - 0.2) * PX_PER_MM}px`;
                div.style.height = `${(currentW - 0.2) * PX_PER_MM}px`;
            }
            
            // Tandai status rotasi foto
            div.dataset.rotated = (div.dataset.rotated === "true") ? "false" : "true";
            
            // 3. Susun ulang kertas secara otomatis
            reflowHalaman();
        };
    }));
    
    // 4. Tombol Crop Ulang
    actionsDiv.appendChild(createBtn('✂️', 'Crop Ulang', () => {
        targetRecropElement = div;
        const cropImg = document.getElementById('cropImage');
        if (!cropImg) return;
        
        if (typeof cropper !== 'undefined' && cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (typeof resetFilterSliders === 'function') resetFilterSliders();
        
        cropImg.onload = () => {
            if (typeof bukaCropModal === 'function') bukaCropModal();
            
            setTimeout(() => {
                let p = dapatkanPengaturan();
                let targetW = parseFloat(div.dataset.w_mm) || p.w_mm;
                let targetH = parseFloat(div.dataset.h_mm) || p.h_mm;
                
                let cropRatio = (!p.stretch && targetW > 0 && targetH > 0) ? targetW / targetH : NaN;
                
                cropper = new Cropper(cropImg, { 
                    viewMode: 1, 
                    dragMode: 'move', 
                    autoCropArea: 1, 
                    aspectRatio: cropRatio, 
                    responsive: true, 
                    restore: false, 
                    checkOrientation: false, 
                    ready() { 
                        if (typeof terapkanFilterModal === 'function') terapkanFilterModal(); 
                    } 
                });
            }, 50);
        };
        
        cropImg.src = img.src;
    }));
    
    div.appendChild(actionsDiv);
    
    // Garis Potong (Marking Siku di 4 Sudut Foto)
    div.insertAdjacentHTML('beforeend', `
        <div class="crop-mark mark-tl"></div>
        <div class="crop-mark mark-tr"></div>
        <div class="crop-mark mark-bl"></div>
        <div class="crop-mark mark-br"></div>
    `);
    
    return div;
}

function renderUlangKertas(pageId, selectId) {
    manualZoom = 1; 
    let workspace = document.getElementById(getWorkspaceId(pageId)); 
    if(!workspace) return;
    
    let existingImages = [];
    workspace.querySelectorAll('.photo-item').forEach(item => {
        let img = item.querySelector('img');
        if(img) {
            let isRotated = item.dataset.rotated === "true";
            let p = dapatkanPengaturan();
            
            // Ambil ukuran mm asli dari dataset, jika tidak ada gunakan fallback p.w_mm / p.h_mm
            let origW = parseFloat(item.dataset.w_mm) || p.w_mm;
            let origH = parseFloat(item.dataset.h_mm) || p.h_mm;
            
            let finalW = isRotated ? origH : origW;
            let finalH = isRotated ? origW : origH;
            
            let safeW = Math.max(1, finalW - 0.2);
            let safeH = Math.max(1, finalH - 0.2);
            
            existingImages.push({ 
                src: img.src, 
                className: img.className || 'stretch-off', 
                w_mm: finalW,
                h_mm: finalH,
                wPx: `${safeW * PX_PER_MM}px`, 
                hPx: `${safeH * PX_PER_MM}px`,
                isRotated: isRotated
            });
        }
    });
    
    workspace.innerHTML = ''; 
    const paperDim = getPaperDimensions(pageId, document.getElementById(selectId)?.value || 'a4');
    tambahHalamanKertas(getWorkspaceId(pageId), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
    
    if (existingImages.length > 0) {
        susunUlangGambar(existingImages, getWorkspaceId(pageId), pageId);
    }
    updateLayoutRealtime(); 
}

function reflowHalaman() {
    if (!halamanAktif || halamanAktif === 'hitunggambar') return;
    
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (!workspace) return;
    
    setTimeout(() => {
        let p = dapatkanPengaturan();
        let existingImages = [];
        
        workspace.querySelectorAll('.photo-item').forEach(item => {
            let img = item.querySelector('img');
            if (img) {
                let finalW, finalH;
                
                if (halamanAktif === 'printgambar') {
                    finalW = p.w_mm;
                    finalH = p.h_mm;
                    } else if (halamanAktif === 'gridkertas') {
                    finalW = p.w_mm;
                    finalH = p.h_mm;
                    } else {
                    // KHUSUS PASFOTO & CUSTOMFOTO:
                    // BACA MURNI dari dataset foto masing-masing! Jangan pakai variabel form p.w_mm lagi
                    finalW = parseFloat(item.dataset.w_mm) || p.w_mm;
                    finalH = parseFloat(item.dataset.h_mm) || p.h_mm;
                }
                
                let safeW = Math.max(1, finalW - 0.2);
                let safeH = Math.max(1, finalH - 0.2);
                
                // Simpan data foto individual
                existingImages.push({ 
                    src: img.src, 
                    className: (halamanAktif === 'printgambar') ? 'stretch-on' : (img.className || 'stretch-off'), 
                    w_mm: finalW, // Ukuran mandiri
                    h_mm: finalH, // Ukuran mandiri
                    wPx: `${safeW * PX_PER_MM}px`, 
                    hPx: `${safeH * PX_PER_MM}px`,
                    isRotated: item.dataset.rotated === "true"
                });
            }
        });
        
        // Render ulang kertas
        workspace.innerHTML = ''; 
        const selEl = document.getElementById(getSelectId(halamanAktif));
        let paperDim = getPaperDimensions(halamanAktif, selEl ? selEl.value : 'a4');
        
        tambahHalamanKertas(getWorkspaceId(halamanAktif), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
        
        if (existingImages.length > 0) {
            susunUlangGambar(existingImages, getWorkspaceId(halamanAktif), halamanAktif);
        }
        
        updateLayoutRealtime(); 
    }, 10);
}

function updateLayoutRealtime() {
    if(!halamanAktif || halamanAktif === 'hitunggambar') return;
    let p = dapatkanPengaturan(), workspace = document.getElementById(getWorkspaceId(halamanAktif)); 
    if(!workspace) return;
    
    let padPx = p.margin * PX_PER_MM; 
    if (p.mark && halamanAktif !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    workspace.style.setProperty('--mark-offset', `-${(p.gap / 2) * PX_PER_MM}px`);
    
    if (halamanAktif === 'gridkertas') { 
        workspace.querySelectorAll('.photo-item').forEach(item => { 
            item.style.width = `${p.w_mm * PX_PER_MM}px`; 
            item.style.height = `${p.h_mm * PX_PER_MM}px`; 
        }); 
    }
    
    workspace.querySelectorAll('.paper-page').forEach(page => {
        page.style.padding = `${padPx}px`;
        
        if (halamanAktif === 'polaroid') {
            page.style.gap = '0px';
            page.style.columnGap = '0px';
            page.style.rowGap = '0px';
            page.style.flexWrap = 'wrap';
            
            // GANTI BAGIAN INI MENJADI 'center'
            page.style.setProperty('justify-content', window.posisiX || 'center', 'important');
            page.style.setProperty('align-content', window.posisiY || 'center', 'important');
            page.style.setProperty('align-items', window.posisiY || 'center', 'important');
            
            const polaroidMark = document.getElementById('polaroidMarking')?.checked;
            if (polaroidMark) page.classList.add('show-marks');
            else page.classList.remove('show-marks');
            } else {
            page.style.gap = `${p.gap * PX_PER_MM}px`;
            
            if (p.mark && halamanAktif !== 'gridkertas' && halamanAktif !== 'printgambar') {
                page.classList.add('show-marks'); 
                } else {
                page.classList.remove('show-marks');
            }
        }
        
        page.querySelectorAll('.grid-mark-overlay').forEach(el => el.remove());
        page.querySelectorAll('.polaroid-mark-overlay').forEach(el => el.remove());
        
        // --- MODE GRID KERTAS ---
        if (halamanAktif === 'gridkertas' && p.mark) {
            let items = page.querySelectorAll('.photo-item');
            if (items.length > 0) {
                let cols = parseInt(document.getElementById('gridKolom').value) || 1, 
                actualCols = Math.min(items.length, cols), 
                actualRows = Math.ceil(items.length / cols);
                let itemWPx = p.w_mm * PX_PER_MM, itemHPx = p.h_mm * PX_PER_MM, gapPx = p.gap * PX_PER_MM;
                let gridWidth = actualCols * itemWPx + (actualCols - 1) * gapPx, 
                gridHeight = actualRows * itemHPx + (actualRows - 1) * gapPx, 
                markLengthPx = 2 * PX_PER_MM;
                
                for (let c = 1; c < actualCols; c++) {
                    let x = padPx + c * itemWPx + (c - 0.5) * gapPx;
                    page.insertAdjacentHTML('beforeend', `<div class="grid-mark-overlay" style="width:0.5px; height:2mm; left:${x}px; top:${padPx}px; transform:translateX(-50%);"></div>`);
                    page.insertAdjacentHTML('beforeend', `<div class="grid-mark-overlay" style="width:0.5px; height:2mm; left:${x}px; top:${padPx + gridHeight - markLengthPx}px; transform:translateX(-50%);"></div>`);
                }
                for (let r = 1; r < actualRows; r++) {
                    let y = padPx + r * itemHPx + (r - 0.5) * gapPx;
                    page.insertAdjacentHTML('beforeend', `<div class="grid-mark-overlay" style="width:2mm; height:0.5px; top:${y}px; left:${padPx}px; transform:translateY(-50%);"></div>`);
                    page.insertAdjacentHTML('beforeend', `<div class="grid-mark-overlay" style="width:2mm; height:0.5px; top:${y}px; left:${padPx + gridWidth - markLengthPx}px; transform:translateY(-50%);"></div>`);
                }
            }
        }
        
        // --- MODE PASFOTO & CUSTOMFOTO ---
        if ((halamanAktif === 'pasfoto' || halamanAktif === 'customfoto') && p.mark) {
            const items = Array.from(page.querySelectorAll('.photo-item'));
            if (items.length > 0) {
                items.forEach((item) => {
                    const mTL = item.querySelector('.mark-tl');
                    const mTR = item.querySelector('.mark-tr');
                    const mBL = item.querySelector('.mark-bl');
                    const mBR = item.querySelector('.mark-br');
                    
                    [mTL, mTR, mBL, mBR].forEach(m => {
                        if (m) {
                            m.style.border = 'none';
                            m.style.left = '';
                            m.style.right = '';
                            m.style.top = '';
                            m.style.bottom = '';
                            m.style.transform = 'none';
                        }
                    });
                    
                    const itemLeft = item.offsetLeft;
                    const itemTop = item.offsetTop;
                    const itemRight = itemLeft + item.offsetWidth;
                    const itemBottom = itemTop + item.offsetHeight;
                    
                    const hasTopNeighbor = items.some(other => other !== item && Math.abs(other.offsetLeft - itemLeft) < 5 && Math.abs((other.offsetTop + other.offsetHeight) - itemTop) < 10);
                    const hasBottomNeighbor = items.some(other => other !== item && Math.abs(other.offsetLeft - itemLeft) < 5 && Math.abs(other.offsetTop - itemBottom) < 10);
                    const hasLeftNeighbor = items.some(other => other !== item && Math.abs(other.offsetTop - itemTop) < 5 && Math.abs((other.offsetLeft + other.offsetWidth) - itemLeft) < 10);
                    const hasRightNeighbor = items.some(other => other !== item && Math.abs(other.offsetTop - itemTop) < 5 && Math.abs(other.offsetLeft - itemRight) < 10);
                    
                    if (!hasTopNeighbor && !hasLeftNeighbor && mTL) { mTL.style.borderTop = '0.75pt solid #000'; mTL.style.borderLeft = '0.75pt solid #000'; }
                    if (!hasTopNeighbor && !hasRightNeighbor && mTR) { mTR.style.borderTop = '0.75pt solid #000'; mTR.style.borderRight = '0.75pt solid #000'; }
                    if (!hasBottomNeighbor && !hasLeftNeighbor && mBL) { mBL.style.borderBottom = '0.75pt solid #000'; mBL.style.borderLeft = '0.75pt solid #000'; }
                    if (!hasBottomNeighbor && !hasRightNeighbor && mBR) { mBR.style.borderBottom = '0.75pt solid #000'; mBR.style.borderRight = '0.75pt solid #000'; }
                });
            }
        }
        
        // --- MODE KHUSUS POLAROID.HTML: SUDUT LUAR = L, PERTEMUAN = T PRESISI ---
        if (halamanAktif === 'polaroid' && document.getElementById('polaroidMarking')?.checked) {
            const items = Array.from(page.querySelectorAll('.polaroid-card'));
            
            if (items.length > 0) {
                const markLength = 2 * PX_PER_MM; // Panjang garis
                const markWidth = 0.75;           // Tebal garis
                const tolerance = 4;              // Toleransi kemelesetan piksel
                
                // 1. Bersihkan semua garis lama & CSS bawaan
                page.querySelectorAll('.polaroid-mark-overlay').forEach(el => el.remove());
                items.forEach(card => {
                    card.querySelectorAll('.crop-mark').forEach(mark => {
                        mark.style.display = 'none';
                        mark.style.border = 'none';
                    });
                });
                
                // 2. Ambil koordinat dan fungsi pendeteksi tetangga
                const cardsData = items.map(card => ({
                    left: card.offsetLeft,
                    top: card.offsetTop,
                    right: card.offsetLeft + card.offsetWidth,
                    bottom: card.offsetTop + card.offsetHeight
                }));
                
                function getNeighbor(card, side) {
                    return cardsData.find(other => {
                        if (other === card) return false;
                        if (side === 'left') return Math.abs(other.right - card.left) <= tolerance && Math.abs(other.top - card.top) <= tolerance;
                        if (side === 'right') return Math.abs(other.left - card.right) <= tolerance && Math.abs(other.top - card.top) <= tolerance;
                        if (side === 'top') return Math.abs(other.bottom - card.top) <= tolerance && Math.abs(other.left - card.left) <= tolerance;
                        if (side === 'bottom') return Math.abs(other.top - card.bottom) <= tolerance && Math.abs(other.left - card.left) <= tolerance;
                    });
                }
                
                // Petakan sisi mana saja yang menyentuh area kosong (Outer Edges)
                cardsData.forEach(card => {
                    card.nLeft = getNeighbor(card, 'left');
                    card.nRight = getNeighbor(card, 'right');
                    card.nTop = getNeighbor(card, 'top');
                    card.nBottom = getNeighbor(card, 'bottom');
                    
                    card.isOuterLeft = !card.nLeft;
                    card.isOuterRight = !card.nRight;
                    card.isOuterTop = !card.nTop;
                    card.isOuterBottom = !card.nBottom;
                });
                
                function garis(left, top, width, height) {
                    const el = document.createElement('div');
                    el.className = 'polaroid-mark-overlay';
                    Object.assign(el.style, {
                        position: 'absolute', left: `${left}px`, top: `${top}px`,
                        width: `${width}px`, height: `${height}px`,
                        background: '#000', pointerEvents: 'none', zIndex: '100'
                    });
                    page.appendChild(el);
                }
                
                // 3. Gambar Garis Potong Berdasarkan Status Tepi
                cardsData.forEach(card => {
                    
                    // --- A. TEPI LUAR (Area Kosong) ---
                    if (card.isOuterLeft) {
                        if (!card.nTop || (card.nTop && !card.nTop.isOuterLeft)) garis(card.left, card.top, markWidth, markLength); // Siku turun
                        if (!card.nBottom || (card.nBottom && !card.nBottom.isOuterLeft)) garis(card.left, card.bottom - markLength, markWidth, markLength); // Siku naik
                    }
                    if (card.isOuterRight) {
                        // Ini yang akan menggambar siku turun di ujung kanan area kosong
                        if (!card.nTop || (card.nTop && !card.nTop.isOuterRight)) garis(card.right - markWidth, card.top, markWidth, markLength);
                        if (!card.nBottom || (card.nBottom && !card.nBottom.isOuterRight)) garis(card.right - markWidth, card.bottom - markLength, markWidth, markLength);
                    }
                    if (card.isOuterTop) {
                        if (!card.nLeft || (card.nLeft && !card.nLeft.isOuterTop)) garis(card.left, card.top, markLength, markWidth); // Siku ke kanan
                        if (!card.nRight || (card.nRight && !card.nRight.isOuterTop)) garis(card.right - markLength, card.top, markLength, markWidth); // Siku ke kiri
                    }
                    if (card.isOuterBottom) {
                        if (!card.nLeft || (card.nLeft && !card.nLeft.isOuterBottom)) garis(card.left, card.bottom - markWidth, markLength, markWidth); 
                        if (!card.nRight || (card.nRight && !card.nRight.isOuterBottom)) garis(card.right - markLength, card.bottom - markWidth, markLength, markWidth); 
                    }
                    
                    // --- B. PERTEMUAN ANTAR KARTU (Garis Pemisah Lurus) ---
                    if (card.nRight) {
                        const rCard = card.nRight;
                        if (!card.nTop && !rCard.nTop) garis(card.right - markWidth/2, card.top, markWidth, markLength);
                        if (!card.nBottom && !rCard.nBottom) garis(card.right - markWidth/2, card.bottom - markLength, markWidth, markLength);
                    }
                    if (card.nBottom) {
                        const bCard = card.nBottom;
                        if (!card.nLeft && !bCard.nLeft) garis(card.left, card.bottom - markWidth/2, markLength, markWidth);
                        if (!card.nRight && !bCard.nRight) garis(card.right - markLength, card.bottom - markWidth/2, markLength, markWidth);
                    }
                });
            }
        }
        
        
    });
    
    terapkanZoom();
}

function aksiTambah() {
    if (!currentImgSrc) { 
        alert('Silakan upload dan crop foto terlebih dahulu!'); 
        return; 
    }
    
    let p = dapatkanPengaturan();
    let isRotate90 = (halamanAktif === 'pasfoto' && document.getElementById('rotate90Check')?.checked);
    
    if (isRotate90) {
        // Ambil MURNI dari currentImgSrc (Master Foto Crop Pertama)
        let tempImg = new Image();
        tempImg.src = currentImgSrc;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.height;
            canvas.height = tempImg.width;
            
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            
            // Masukkan ke kertas dengan W & H terbalik (misal 30x20 mm), tanpa mengubah crop/stretch
            masukkanKeHalamanKertas(
                canvas.toDataURL('image/jpeg', 0.95), 
                p.h_mm, // Lebar baru (tinggi asli)
                p.w_mm, // Tinggi baru (lebar asli)
                p.qty, 
                false, 
                true
            );
        };
        } else {
        masukkanKeHalamanKertas(currentImgSrc, p.w_mm, p.h_mm, p.qty, false, false);
    }
}

function aksiOtomatis() {
    if (!currentImgSrc) { 
        alert('Silakan upload dan crop foto terlebih dahulu!'); 
        return; 
    }
    
    let p = dapatkanPengaturan();
    let isRotate90 = (halamanAktif === 'pasfoto' && document.getElementById('rotate90Check')?.checked);
    
    if (isRotate90) {
        let tempImg = new Image();
        tempImg.src = currentImgSrc;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.height;
            canvas.height = tempImg.width;
            
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(tempImg, -tempImg.width / 2, -tempImg.height / 2);
            
            masukkanKeHalamanKertas(
                canvas.toDataURL('image/jpeg', 0.95), 
                p.h_mm, 
                p.w_mm, 
                999, 
                true, 
                true
            );
        };
        } else {
        masukkanKeHalamanKertas(currentImgSrc, p.w_mm, p.h_mm, 999, true, false);
    }
}

function masukkanKeHalamanKertas(imgSrc, w_mm, h_mm, qty, autoFill, isRotated = false) {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    let p = dapatkanPengaturan();
    const selEl = document.getElementById(getSelectId(halamanAktif));
    const paperDim = getPaperDimensions(halamanAktif, selEl ? selEl.value : 'a4');
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && halamanAktif !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    let pages = workspace.querySelectorAll('.paper-page');
    pages.forEach(pEl => { 
        pEl.style.padding = `${padPx}px`; 
        pEl.style.gap = `${p.gap * PX_PER_MM}px`; 
        pEl.style.transform = 'none'; 
    });
    
    let limit = autoFill ? 999 : qty, itemsAdded = 0, newPageForAutoFill = false;
    
    for (let i = 0; i < limit; i++) {
        let lastPage = pages[pages.length - 1];
        let div = buatElemenFoto(
            imgSrc, 
            `${w_mm * PX_PER_MM}px`, 
            `${h_mm * PX_PER_MM}px`, 
            currentImgClassName, 
            w_mm, 
            h_mm
        );
        
        if (isRotated) {
            div.dataset.rotated = "true";
        }
        
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
    // Fungsi bawaan reset UI form Anda
    let workspace = document.getElementById(getWorkspaceId(pageId)); if (workspace) workspace.innerHTML = '';
    // (Kode reset form input diabaikan di sini agar ringkas, Anda bisa menempatkan logika reset form HTML Anda di sini)
    toggleCustomPaperInput(pageId); renderUlangKertas(pageId, getSelectId(pageId)); currentImgSrc = null; tutupCropModal(); targetRecropElement = null;
}

function aksiRata(align) {
    // Simpan pilihan posisi pengguna (misal: 'center', 'flex-start', 'flex-end')
    currentAlignment = align; 
    
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (workspace) {
        workspace.querySelectorAll('.paper-page').forEach(p => p.style.justifyContent = align);
    }
    tutupSemuaMenu();
}

// ==========================================================================
//    TAMBAHAN LOGIKA KHUSUS HALAMAN POLAROID
// ==========================================================================

// 1. Membelokkan sistem reflow bawaan saat berada di halaman polaroid
const originalRenderUlangKertas = window.renderUlangKertas;
window.renderUlangKertas = function(pageId, selectId) {
    if (pageId === 'polaroid') {
        window.renderKertasPolaroid();
        } else {
        if(originalRenderUlangKertas) originalRenderUlangKertas(pageId, selectId);
    }
};

const originalReflowHalaman = window.reflowHalaman;
window.reflowHalaman = function() {
    if (halamanAktif === 'polaroid') {
        // Cek dan setel tampilan frame jika foto baru saja dipotong oleh Cropper
        document.querySelectorAll('.polaroid-card').forEach(card => {
            const img = card.querySelector('img');
            if (img && img.src && !img.src.endsWith(window.location.host + '/')) {
                card.classList.add('has-image');
            }
        });
        window.renderKertasPolaroid();
        } else {
        if(originalReflowHalaman) originalReflowHalaman();
    }
};

// 2. Fungsi Utama Merender Kertas Polaroid
window.renderKertasPolaroid = function() {
    const workspace = document.getElementById('workspacePolaroid');
    if (!workspace) return;
    
    const sizeId = document.getElementById('polaroidPaperSize')?.value || '3r';
    const orient = document.getElementById('polaroidOrientation')?.value || 'portrait';
    let dim = getPaperDimensions('polaroid', sizeId);
    
    // Kalkulasi presisi Portrait / Landscape
    if (orient === 'landscape') {
        dim = { w: Math.max(dim.w, dim.h), h: Math.min(dim.w, dim.h) };
        } else {
        dim = { w: Math.min(dim.w, dim.h), h: Math.max(dim.w, dim.h) };
    }
    
    const existingCards = Array.from(workspace.querySelectorAll('.polaroid-card'));
    workspace.innerHTML = '';
    
    let currentPage = tambahHalamanKertas('workspacePolaroid', dim.w * PX_PER_MM, dim.h * PX_PER_MM);
    const marginPx = (parseFloat(document.getElementById('polaroidMarginInput')?.value) || 0) * PX_PER_MM;
    
    const applyPageStyle = (page) => {
        page.style.padding = `${marginPx}px`;
        page.style.gap = `0px`; 
        page.style.columnGap = `0px`;
        page.style.rowGap = `0px`;
        
        // GANTI BAGIAN INI MENJADI 'center'
        page.style.setProperty('justify-content', window.posisiX || 'center', 'important');
        page.style.setProperty('align-content', window.posisiY || 'center', 'important');
        page.style.setProperty('align-items', window.posisiY || 'center', 'important');
        if (document.getElementById('polaroidMarking')?.checked) {
            page.classList.add('show-marks');
            } else {
            page.classList.remove('show-marks');
        }
    };
    applyPageStyle(currentPage);
    
    existingCards.forEach(card => {
        currentPage.appendChild(card);
        // Berikan toleransi piksel yang cukup agar tidak mudah lompat ke halaman 2
        if (currentPage.scrollHeight > currentPage.clientHeight + 10 || currentPage.scrollWidth > currentPage.clientWidth + 10) {
            currentPage.removeChild(card);
            currentPage = tambahHalamanKertas('workspacePolaroid', dim.w * PX_PER_MM, dim.h * PX_PER_MM);
            applyPageStyle(currentPage);
            currentPage.appendChild(card);
        }
    });
    
    if (existingCards.length === 0) {
        window.tambahKartuPolaroid(currentPage, dim, applyPageStyle);
    }
    
    updateLayoutRealtime();
    terapkanZoom();
};

// 3. Fungsi Menambahkan Frame Polaroid
window.tambahKartuPolaroid = function(targetPage = null, dim = null, applyPageStyle = null) {
    const id = 'pol_' + Math.random().toString(36).substr(2, 9);
    const card = document.createElement('div');
    card.className = 'polaroid-card';
    card.id = id;
    
    card.innerHTML = `
    <div class="polaroid-photo" onclick="window.triggerUploadPolaroid('${id}')">
    <img id="img_${id}" src="" alt="foto" class="stretch-off">
    <button class="polaroid-add-btn">➕</button>
    </div>
    <div class="polaroid-menu">
    <button class="btn-dots" onclick="window.togglePolaroidBgMenu(event, '${id}')">⋮</button>
    <div class="bg-dropdown" id="menu_${id}">
    <button onclick="window.setPolaroidBg('${id}', 'none')">⬜ Polos Putih</button>
    <button onclick="window.setPolaroidBg('${id}', 'ig')">📱 Tema IG</button>
    <button onclick="window.setPolaroidBg('${id}', 'player')">🎵 Tema Player</button>
    <button onclick="window.triggerCustomBg('${id}')">📁 Custom Background</button>
    </div>
    </div>
    `;
    
    let workspace = document.getElementById('workspacePolaroid');
    if(!workspace) return;
    
    let pages = workspace.querySelectorAll('.paper-page');
    let lastPage = targetPage || (pages.length > 0 ? pages[pages.length - 1] : null);
    
    if (lastPage) {
        lastPage.appendChild(card);
        if (!targetPage && (lastPage.scrollHeight > lastPage.clientHeight + 2 || lastPage.scrollWidth > lastPage.clientWidth + 2)) {
            lastPage.removeChild(card);
            
            if (!dim) {
                const sizeId = document.getElementById('polaroidPaperSize')?.value || '3r';
                const orient = document.getElementById('polaroidOrientation')?.value || 'portrait';
                dim = getPaperDimensions('polaroid', sizeId);
                if (orient === 'landscape') dim = { w: Math.max(dim.w, dim.h), h: Math.min(dim.w, dim.h) };
            }
            
            lastPage = tambahHalamanKertas('workspacePolaroid', dim.w * PX_PER_MM, dim.h * PX_PER_MM);
            const marginPx = (parseFloat(document.getElementById('polaroidMarginInput')?.value) || 0) * PX_PER_MM;
            lastPage.style.padding = `${marginPx}px`;
            lastPage.style.gap = `0px`;
            lastPage.style.columnGap = `0px`;
            lastPage.style.rowGap = `0px`;
            if (document.getElementById('polaroidMarking')?.checked) lastPage.classList.add('show-marks');
            
            lastPage.appendChild(card);
        }
    }
    updateLayoutRealtime();
    terapkanZoom();
};

// 4. Integrasi dengan Cropper (editor.js)
window.triggerUploadPolaroid = function(id) {
    // Membidik targetRecropElement agar Cropper memasukkan foto ke kotak ini
    targetRecropElement = document.getElementById(id);
    
    // PANGGIL VARIABEL GLOBAL fileInput BUKAN querySelector
    if (typeof fileInput !== 'undefined') {
        fileInput.click();
        } else {
        alert("Sistem uploader belum siap, silakan muat ulang halaman.");
    }
};

// 5. Fungsi Menu dan Background
window.togglePolaroidBgMenu = function(e, id) {
    e.stopPropagation();
    const menu = document.getElementById('menu_' + id);
    document.querySelectorAll('.bg-dropdown').forEach(m => { if (m !== menu) m.style.display = 'none'; });
    menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
};

document.addEventListener('click', () => {
    document.querySelectorAll('.bg-dropdown').forEach(m => m.style.display = 'none');
});

window.setPolaroidBg = function(id, type) {
    const card = document.getElementById(id);
    if (!card) return;
    
    if (type === 'none') {
        card.style.backgroundImage = 'none';
        card.style.backgroundColor = '#ffffff';
        } else if (type === 'ig') {
        card.style.backgroundImage = 'url(img/bg-01.png)';
        } else if (type === 'player') {
        card.style.backgroundImage = 'url(img/bg-02.png)';
    }
};

let currentCustomBgTarget = null;
window.triggerCustomBg = function(id) {
    currentCustomBgTarget = id;
    document.getElementById('bgUploaderPolaroid').click();
};

window.handleCustomBg = function(input) {
    if (input.files && input.files[0] && currentCustomBgTarget) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const card = document.getElementById(currentCustomBgTarget);
            if (card) {
                card.style.backgroundImage = `url(${e.target.result})`;
            }
            currentCustomBgTarget = null;
        }
        reader.readAsDataURL(input.files[0]);
    }
    input.value = '';
};

// 6. Reset Form
window.resetPolaroid = function() {
    const workspace = document.getElementById('workspacePolaroid');
    if (workspace) workspace.innerHTML = '';
    window.renderKertasPolaroid();
};

// Variabel memori agar saat tambah kertas baru posisinya tidak berantakan
window.posisiX = 'center';
window.posisiY = 'center';

window.aksiRataPosisi = function(x, y) {
    window.posisiX = x;
    window.posisiY = y;
    
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (workspace) {
        workspace.querySelectorAll('.paper-page').forEach(page => {
            page.style.setProperty('justify-content', x, 'important');
            page.style.setProperty('align-content', y, 'important');
            page.style.setProperty('align-items', y, 'important');
        });
    }
    
    // PERBAIKAN BUG MENU: Hapus paksaan style dan gunakan sistem klik natural
    let menu = document.getElementById('RataPas');
    if(menu) {
        menu.style.display = ''; // Bersihkan blokir inline
    }
    document.body.click(); // Memicu klik di luar menu agar tertutup otomatis dengan aman
    
    // Tunggu animasi geser selesai, lalu gambar ulang garis potongnya
    setTimeout(() => {
        if (typeof updateLayoutRealtime === 'function') updateLayoutRealtime();
    }, 100);
};