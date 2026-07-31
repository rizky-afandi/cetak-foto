// Registrasi Service Worker secara Global di app.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
            console.log('ServiceWorker berhasil terdaftar dengan scope: ', registration.scope);
        })
        .catch((error) => {
            console.log('ServiceWorker gagal terdaftar: ', error);
        });
    });
}

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
        
        if (fileHtml === 'pasfoto.html') {
            halamanAktif = 'pasfoto';
            } else if (fileHtml === 'grid.html') {
            halamanAktif = 'gridkertas';
            } else if (fileHtml === 'custom.html') {
            halamanAktif = 'customfoto';
            } else if (fileHtml === 'hitung.html') {
            halamanAktif = 'hitunggambar';
            } else if (fileHtml === 'polaroid.html') {
            halamanAktif = 'polaroid';
        }
        
        // Pastikan modal crop tersembunyi
        tutupCropModal();
        
        setTimeout(() => {
            toggleCustomPaperInput(halamanAktif);
            if (halamanAktif === 'hitunggambar') {
                if (typeof hitungKapasitasOtomatis === 'function') hitungKapasitasOtomatis();
                } else {
                renderUlangKertas(halamanAktif, getSelectId(halamanAktif));
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

// Fungsi Navigasi Kembali ke Menu Utama (Tombol Home)
function kembaliKeMenu() {
    halamanAktif = '';
    
    // 1. Kosongkan area workspace/halaman
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.innerHTML = '';
    
    // 2. Tampilkan kembali Main Menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'grid';
    
    // 3. Pastikan Header Tetap Tampil Sejajar (Flex)
    const header = document.getElementById('header');
    if (header) {
        header.style.display = 'flex'; // Dipastikan flex, bukan block/none
        header.classList.remove('in-subpage');
    }
    
    // 4. Tutup modal crop & menu titik tiga jika sedang terbuka
    tutupCropModal();
    if (typeof tutupHeaderMenu === 'function') {
        tutupHeaderMenu();
    }
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

let lastZoomRatio = 1;
let defaultZoomRatio = 1;

// Helper Reset Filter Slider
function resetFilterSliders() {
    const zoomSlider = document.getElementById('cropZoomSlider');
    const rotateSlider = document.getElementById('cropRotateSlider');
    const bSlider = document.getElementById('cropBrightness');
    const cSlider = document.getElementById('cropContrast');
    const sSlider = document.getElementById('cropSaturate');
    const rotVal = document.getElementById('rotateValue');

    // Kembalikan slider Zoom ke skala awal foto (bukan dipaksa ke angka 1)
    if (zoomSlider) zoomSlider.value = defaultZoomRatio;
    
    if (rotateSlider) rotateSlider.value = 0;
    if (bSlider) bSlider.value = 100;
    if (cSlider) cSlider.value = 100;
    if (sSlider) sSlider.value = 100;
    if (rotVal) rotVal.textContent = '0°';
    lastZoomRatio = defaultZoomRatio;

    // Reset filter visual pada gambar
    const cropImgEl = document.getElementById('cropImage');
    if (cropImgEl) cropImgEl.style.filter = 'none';

    const cropperContainer = document.querySelector('.cropper-container');
    if (cropperContainer) cropperContainer.style.filter = 'none';
}

function resetEditGambar() {
    // 1. Reset posisi crop, rotasi, dan zoom bawaan Cropper.js
    if (cropper) {
        cropper.reset();
    }
    
    // 2. Reset semua nilai slider dan filter visual
    resetFilterSliders();
}

// PERBAIKAN UTAMA: Terapkan Filter ke Seluruh Container Cropper
function terapkanFilterModal() {
    const b = document.getElementById('cropBrightness')?.value || 100;
    const c = document.getElementById('cropContrast')?.value || 100;
    const s = document.getElementById('cropSaturate')?.value || 100;
    
    const filterString = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    
    // 1. Terapkan filter ke elemen gambar asli
    const cropImgEl = document.getElementById('cropImage');
    if (cropImgEl) cropImgEl.style.filter = filterString;
    
    // 2. Terapkan filter ke container utama Cropper (Dijamin merubah pratinjau di HP & PC)
    const cropperContainer = document.querySelector('.cropper-container');
    if (cropperContainer) {
        cropperContainer.style.filter = filterString;
    }
}

// Kontrol Zoom & Rotasi
function aturZoomModal(nilai) {
    if (!cropper) return;
    const targetZoom = parseFloat(nilai);
    cropper.zoomTo(targetZoom);
}

function aturRotasiModal(nilai) {
    if (!cropper) return;
    const deg = parseInt(nilai);
    const rotVal = document.getElementById('rotateValue');
    if (rotVal) rotVal.textContent = `${deg}°`;
    cropper.rotateTo(deg);
}

function putarCepat(deg) {
    if (!cropper) return;
    cropper.rotate(deg);
    const slider = document.getElementById('cropRotateSlider');
    if (slider) {
        let newDeg = (parseInt(slider.value) + deg) % 360;
        slider.value = newDeg;
        const rotVal = document.getElementById('rotateValue');
        if (rotVal) rotVal.textContent = `${newDeg}°`;
    }
}

// Helper Sembunyikan Modal Crop
function tutupCropModal() {
    const cropModal = document.getElementById('cropModal');
    if (cropModal) {
        cropModal.classList.remove('active');
        cropModal.style.display = 'none';
    }
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    resetFilterSliders();
}

// Buka Modal Crop & Pasang Event Listener Slider
function bukaCropModal() {
    const cropModal = document.getElementById('cropModal');
    if (cropModal) {
        cropModal.classList.add('active');
        cropModal.style.display = 'flex';
    }
}

// PERBAIKAN UTAMA: Event Delegation Global untuk Slider (Responsif di Layar Sentuh HP)
document.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'INPUT' || target.type !== 'range') return;
    
    if (target.id === 'cropZoomSlider') {
        aturZoomModal(target.value);
        } else if (target.id === 'cropRotateSlider') {
        aturRotasiModal(target.value);
        } else if (target.id === 'cropBrightness' || target.id === 'cropContrast' || target.id === 'cropSaturate') {
        terapkanFilterModal();
    }
});

document.addEventListener('change', (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'INPUT' || target.type !== 'range') return;
    
    if (target.id === 'cropZoomSlider') {
        aturZoomModal(target.value);
        } else if (target.id === 'cropRotateSlider') {
        aturRotasiModal(target.value);
        } else if (target.id === 'cropBrightness' || target.id === 'cropContrast' || target.id === 'cropSaturate') {
        terapkanFilterModal();
    }
});

// INIT HALAMAN
document.addEventListener("DOMContentLoaded", () => {
    tutupCropModal();
    
    const pageContainer = document.querySelector('.page');
    if (!pageContainer) return;
    
    halamanAktif = pageContainer.id;
    
    setTimeout(() => {
        toggleCustomPaperInput(halamanAktif);
        if (halamanAktif === 'hitunggambar') {
            hitungKapasitasOtomatis();
            } else {
            renderUlangKertas(halamanAktif, getSelectId(halamanAktif));
        }
    }, 150);
    
    document.querySelectorAll('.uploader-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            targetRecropElement = null;
            fileInput.click();
        });
    });
});

// UPLOAD & CROP (Versi Stabil & Bebas Error untuk HP)
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 1. Ambil elemen gambar modal terlebih dahulu
    const cropImgEl = document.getElementById('cropImage');
    if (!cropImgEl) return;
    
    // 2. Bersihkan memori Blob URL lama jika ada (Aman dari ReferenceError)
    if (cropImgEl.src && cropImgEl.src.startsWith('blob:')) {
        URL.revokeObjectURL(cropImgEl.src);
    }
    
    // 3. Hancurkan instance Cropper lama jika masih menggantung
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // 4. Reset nilai slider ke kondisi awal (100% / 0°)
    resetFilterSliders();
    
    // 5. Buat URL objek baru untuk gambar yang dipilih
    const imgURL = URL.createObjectURL(file);
    
    // 6. PAUTKAN HANDLER ONLOAD TERLEBIH DAHULU (Penting untuk HP!)
    cropImgEl.onload = () => {
        // Tampilkan Modal setelah gambar siap di-load
        bukaCropModal();
        
        // Jeda kecil (100ms) agar DOM modal benar-benar dirender oleh HP
        setTimeout(() => {
            let p = dapatkanPengaturan();
            let cropperRatio = NaN;
            if (!p.stretch && p.w_mm > 0 && p.h_mm > 0) {
                cropperRatio = p.w_mm / p.h_mm;
            }
            
            // Inisialisasi Cropper.js secara aman
            cropper = new Cropper(cropImgEl, {
    viewMode: 0,
    dragMode: 'move',
    autoCropArea: 1,
    aspectRatio: cropperRatio,
    responsive: true,
    restore: false,
    checkOrientation: false,
    zoomOnWheel: true,
    toggleDragModeOnDblclick: false,
    
    ready() {
        terapkanFilterModal();
        
        // 1. Ambil data dimensi gambar asli
        const imageData = cropper.getImageData();
        if (imageData && imageData.naturalWidth > 0) {
            // 2. Hitung skala rasio asli saat pertama kali foto dimuat
            const initialRatio = imageData.width / imageData.naturalWidth;
            
            // SIMPAN KE VARIABEL GLOBAL: Agar tombol Reset tahu posisi awal sebenarnya
            defaultZoomRatio = initialRatio;
            
            const zoomSlider = document.getElementById('cropZoomSlider');
            if (zoomSlider) {
                const minZoom = initialRatio * 0.3;
                const maxZoom = initialRatio * 3.0;
                
                zoomSlider.min = minZoom;
                zoomSlider.max = maxZoom;
                zoomSlider.step = (maxZoom - minZoom) / 100;
                zoomSlider.value = initialRatio; // Setel slider sama persis dengan skala awal
            }
        }
    },
    
    zoom(e) {
        const zoomSlider = document.getElementById('cropZoomSlider');
        if (zoomSlider && e.detail && e.detail.ratio && e.detail.originalEvent) {
            zoomSlider.value = e.detail.ratio;
        }
    }
});
            
        }, 100);
    };
    
    // 7. SETEL SRC GAMBAR (Memicu event onload di atas)
    cropImgEl.src = imgURL;
    
    // 8. Reset nilai input file agar foto yang sama bisa dipilih ulang jika perlu
    fileInput.value = ""; 
});

function terapkanCrop() {
    if(!cropper) return;
    
    // 1. Ambil canvas potongan dasar dari Cropper
    const initialCanvas = cropper.getCroppedCanvas({ 
        imageSmoothingEnabled: true, 
        imageSmoothingQuality: 'high' 
    });
    if (!initialCanvas) return;
    
    // 2. Buat Canvas baru untuk mengaplikasikan filter warna
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = initialCanvas.width;
    filteredCanvas.height = initialCanvas.height;
    const ctx = filteredCanvas.getContext('2d');
    
    // 3. Ambil nilai dari slider
    const b = document.getElementById('cropBrightness')?.value || 100;
    const c = document.getElementById('cropContrast')?.value || 100;
    const s = document.getElementById('cropSaturate')?.value || 100;
    
    // 4. Terapkan filter ke Canvas 2D
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    ctx.drawImage(initialCanvas, 0, 0);
    
    // 5. Ekspor gambar hasil olahan
    const newSrc = filteredCanvas.toDataURL('image/jpeg', 1.0);
    
    if (targetRecropElement) {
        let imgEl = targetRecropElement.querySelector('img');
        if(imgEl) imgEl.src = newSrc;
        targetRecropElement = null;
        updateLayoutRealtime();
        } else {
        currentImgSrc = newSrc;
    }
    
    tutupCropModal();
}

function batalCrop() {
    targetRecropElement = null;
    tutupCropModal();
}

// UTILS & PENGATURAN
function getWorkspaceId(pageId) {
    if(pageId === 'pasfoto') return 'workspacePas';
    if(pageId === 'gridkertas') return 'workspaceGrid';
    if(pageId === 'customfoto') return 'workspaceCustom';
    if(pageId === 'hitunggambar') return 'workspaceCalc';
    if(pageId === 'polaroid') return 'workspacePolaroid';
    return '';
}

function getSelectId(pageId) {
    if(pageId === 'pasfoto') return 'paperSize';
    if(pageId === 'gridkertas') return 'gridPaperSize';
    if(pageId === 'customfoto') return 'customPaperSize';
    if(pageId === 'hitunggambar') return 'calcPaperSize';
    if(pageId === 'polaroid') return 'polaroidPaperSize';
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
    const sizes = {
        '3r': { w: 89, h: 127 },
        '4r': { w: 102, h: 152 },
        '5r': { w: 127, h: 178 },
        '6r': { w: 152, h: 203 },
        'a4': { w: 210, h: 297 },
        'f4': { w: 215, h: 330 }, // Tambahkan ukuran F4/Folio (dalam mm)
        'a5': { w: 148, h: 210 },
        'a6': { w: 105, h: 148 }
    };
    if (s === 'custom') {
        const wInput = document.getElementById(`customPaperW_${pageId}`);
        const hInput = document.getElementById(`customPaperH_${pageId}`);
        return { 
            w: (wInput ? parseFloat(wInput.value) * 10 : 200), 
            h: (hInput ? parseFloat(hInput.value) * 10 : 300) 
        };
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
        } else if(halamanAktif === 'polaroid') {
        p.w_mm = 70; p.h_mm = 90;
        p.gap = parseFloat(document.getElementById('polaroidGapInput')?.value) || 2;
        p.margin = parseFloat(document.getElementById('polaroidMarginInput')?.value) || 3;
        p.qty = parseInt(document.getElementById('polaroidQtyInput')?.value) || 1;
        p.mark = document.getElementById('polaroidShowMarking')?.checked || false;
    }
    return p;
}

// ZOOM WORKSPACE
function ubahZoom(d) { manualZoom = Math.max(0.3, Math.min(4, manualZoom + d)); terapkanZoom(); }
function resetZoom() { manualZoom = 1; terapkanZoom(); }
function terapkanZoom() {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (!workspace) return;
    const wrapper = workspace.closest('.workspace-container')?.querySelector('.paper-wrapper') || workspace.parentElement;
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
    const paperDim = getPaperDimensions(pageId, document.getElementById(selectId)?.value || 'a4');
    tambahHalamanKertas(getWorkspaceId(pageId), paperDim.w * PX_PER_MM, paperDim.h * PX_PER_MM);
    
    if (existingImages.length > 0) susunUlangGambar(existingImages, getWorkspaceId(pageId), pageId);
    updateLayoutRealtime(); 
}

function reflowHalaman() {
    if (!halamanAktif || halamanAktif === 'hitunggambar') return;
    
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
    const selEl = document.getElementById(getSelectId(halamanAktif));
    const paperDim = getPaperDimensions(halamanAktif, selEl ? selEl.value : 'a4');
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
    const selEl = document.getElementById(getSelectId(pageId));
    const paperDim = getPaperDimensions(pageId, selEl ? selEl.value : 'a4');
    
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
        const cropImg = document.getElementById('cropImage');
        if(cropImg) cropImg.src = img.src;
        
        bukaCropModal();
        
        let p = dapatkanPengaturan();
        if(cropper) cropper.destroy();
        
        resetFilterSliders();
        
        cropper = new Cropper(document.getElementById('cropImage'), { 
            viewMode: 1, 
            dragMode: 'move',
            autoCropArea: 1, 
            aspectRatio: (!p.stretch ? (p.w_mm / p.h_mm) : NaN) 
        });
    }));
    
    div.appendChild(actionsDiv);
    
    // Siku L khusus Pas Foto & Custom
    if (halamanAktif !== 'gridkertas') {
        div.insertAdjacentHTML('beforeend', `<div class="crop-mark mark-tl"></div><div class="crop-mark mark-tr"></div><div class="crop-mark mark-bl"></div><div class="crop-mark mark-br"></div>`);
    }
    return div;
}

// UPDATE LAYOUT & MARKING
function updateLayoutRealtime() {
    if(!halamanAktif || halamanAktif === 'hitunggambar') return;
    
    let p = dapatkanPengaturan();
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if(!workspace) return;
    
    let padPx = p.margin * PX_PER_MM;
    if (p.mark && halamanAktif !== 'gridkertas') padPx += (p.gap / 2) * PX_PER_MM;
    
    workspace.style.setProperty('--mark-offset', `-${(p.gap / 2) * PX_PER_MM}px`);
    
    if (halamanAktif === 'gridkertas') {
        workspace.querySelectorAll('.photo-item').forEach(item => {
            item.style.width = `${p.w_mm * PX_PER_MM}px`; item.style.height = `${p.h_mm * PX_PER_MM}px`;
        });
    }
    
    workspace.querySelectorAll('.paper-page').forEach(page => {
        page.style.padding = `${padPx}px`;
        page.style.gap = `${p.gap * PX_PER_MM}px`;
        
        if (p.mark && halamanAktif !== 'gridkertas') page.classList.add('show-marks');
        else page.classList.remove('show-marks');
        
        page.querySelectorAll('.grid-mark-overlay').forEach(el => el.remove());
        
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
                
                for (let c = 1; c < actualCols; c++) {
                    let x = padPx + c * itemWPx + (c - 0.5) * gapPx;
                    let mTop = document.createElement('div'); mTop.className = 'grid-mark-overlay';
                    mTop.style.cssText = `width: 0.5px; height: 2mm; left: ${x}px; top: ${padPx}px; transform: translateX(-50%);`;
                    let mBot = document.createElement('div'); mBot.className = 'grid-mark-overlay';
                    mBot.style.cssText = `width: 0.5px; height: 2mm; left: ${x}px; top: ${padPx + gridHeight - markLengthPx}px; transform: translateX(-50%);`;
                    page.appendChild(mTop); page.appendChild(mBot);
                }
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
    const selEl = document.getElementById(getSelectId(halamanAktif));
    const paperDim = getPaperDimensions(halamanAktif, selEl ? selEl.value : 'a4');
    
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
        const el = document.getElementById('paperSize'); if(el) el.value = '3r';
        const el2 = document.getElementById('photoSize'); if(el2) el2.value = '20x28';
        const el3 = document.getElementById('rotate90Check'); if(el3) el3.checked = false;
        const el4 = document.getElementById('gapInput'); if(el4) el4.value = '2';
        const el5 = document.getElementById('marginInput'); if(el5) el5.value = '3';
        const el6 = document.getElementById('qtyInput'); if(el6) el6.value = '1';
        const el7 = document.getElementById('showMarking'); if(el7) el7.checked = false;
        } else if(pageId === 'gridkertas') {
        const el = document.getElementById('gridPaperSize'); if(el) el.value = '3r';
        const el2 = document.getElementById('gridKolom'); if(el2) el2.value = '1';
        const el3 = document.getElementById('gridBaris'); if(el3) el3.value = '2';
        const el4 = document.getElementById('gridStretch'); if(el4) el4.checked = false;
        const el5 = document.getElementById('gridGapInput'); if(el5) el5.value = '6';
        const el6 = document.getElementById('gridMarginInput'); if(el6) el6.value = '3';
        const el7 = document.getElementById('gridQtyInput'); if(el7) el7.value = '1';
        const el8 = document.getElementById('gridShowMarking'); if(el8) el8.checked = false;
        } else if(pageId === 'customfoto') {
        const el = document.getElementById('customPaperSize'); if(el) el.value = '3r';
        const el2 = document.getElementById('customPanjang'); if(el2) el2.value = '10';
        const el3 = document.getElementById('customLebar'); if(el3) el3.value = '10';
        const el4 = document.getElementById('customStretch'); if(el4) el4.checked = false;
        const el5 = document.getElementById('customGapInput'); if(el5) el5.value = '2';
        const el6 = document.getElementById('customMarginInput'); if(el6) el6.value = '3';
        const el7 = document.getElementById('customQtyInput'); if(el7) el7.value = '1';
        const el8 = document.getElementById('customShowMarking'); if(el8) el8.checked = false;
    }
    toggleCustomPaperInput(pageId); renderUlangKertas(pageId, getSelectId(pageId));
    currentImgSrc = null;
}

function aksiRata(align) {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if(workspace) workspace.querySelectorAll('.paper-page').forEach(p => p.style.justifyContent = align);
    tutupSemuaMenu();
}

// EXPORT PDF, JPEG, PRINT
function toggleExportMenu(event, menuId) {
    event.stopPropagation();
    ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => {
        if(id === menuId) document.getElementById(id)?.classList.toggle('show');
        else document.getElementById(id)?.classList.remove('show');
    });
}

function tutupSemuaMenu() {
    ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => document.getElementById(id)?.classList.remove('show'));
}
window.addEventListener('click', tutupSemuaMenu);

async function aksiExport(tipe) {
    let workspace = document.getElementById(getWorkspaceId(halamanAktif));
    if (!workspace) return;
    let pages = workspace.querySelectorAll('.paper-page');
    if (pages.length === 0) {
        alert("Tidak ada halaman untuk diekspor!");
        return;
    }
    
    tutupSemuaMenu();

// Mode Print Langsung (Kompatibel dengan Chrome Android & PC)
    if (tipe === 'Print') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // CARA KHUSUS ANDROID: Gunakan Hidden Iframe (Mencegah Error "There was a problem printing...")
            let printIframe = document.getElementById('hiddenPrintIframe');
            if (!printIframe) {
                printIframe = document.createElement('iframe');
                printIframe.id = 'hiddenPrintIframe';
                printIframe.style.position = 'fixed';
                printIframe.style.right = '0';
                printIframe.style.bottom = '0';
                printIframe.style.width = '0';
                printIframe.style.height = '0';
                printIframe.style.border = '0';
                document.body.appendChild(printIframe);
            }

            let pagesHtml = '';
            pages.forEach(p => {
                pagesHtml += `
                    <div class="paper-page ${p.classList.contains('show-marks') ? 'show-marks' : ''}" 
                         style="${p.style.cssText}; transform: none !important; position: relative !important; margin: 0 auto 10mm auto; page-break-after: always; box-shadow: none;">
                        ${p.innerHTML}
                    </div>`;
            });

            const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
            let stylesHtml = '';
            styles.forEach(s => stylesHtml += s.outerHTML);

            const iframeDoc = printIframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(`
                <html>
                <head>
                    <title>Cetak Foto</title>
                    ${stylesHtml}
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .photo-actions { display: none !important; }
                        .crop-mark { display: block !important; }
                        .workspace { display: flex; flex-direction: column; align-items: center; padding: 0; }
                    </style>
                </head>
                <body>
                    <div class="workspace" style="--mark-offset: ${workspace.style.getPropertyValue('--mark-offset')}">
                        ${pagesHtml}
                    </div>
                </body>
                </html>
            `);
            iframeDoc.close();

            // Beri jeda agar resource iframe selesai dimuat oleh Android
            setTimeout(() => {
                try {
                    printIframe.contentWindow.focus();
                    printIframe.contentWindow.print();
                } catch (e) {
                    alert("Gagal memanggil fungsi cetak bawaan HP. Coba gunakan fitur ekspor PDF.");
                }
            }, 600);

        } else {
            // CARA KHUSUS DESKTOP / PC
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                alert("Pop-up diblokir! Harap izinkan pop-up untuk situs ini.");
                return;
            }

            let pagesHtml = '';
            pages.forEach(p => {
                pagesHtml += `
                    <div class="paper-page ${p.classList.contains('show-marks') ? 'show-marks' : ''}" 
                         style="${p.style.cssText}; transform: none !important; position: relative !important; margin: 0 auto 10mm auto; page-break-after: always; box-shadow: none;">
                        ${p.innerHTML}
                    </div>`;
            });

            const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
            let stylesHtml = '';
            styles.forEach(s => stylesHtml += s.outerHTML);

            printWindow.document.write(`
                <html>
                <head>
                    <title>Cetak Langsung</title>
                    ${stylesHtml}
                    <style>
                        @page { size: auto; margin: 0mm; }
                        body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .photo-actions { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="workspace" style="--mark-offset: ${workspace.style.getPropertyValue('--mark-offset')}; padding: 0;">
                        ${pagesHtml}
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.focus();
                                window.print();
                                setTimeout(() => { window.close(); }, 500);
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // Scale 2 sudah setara 300 DPI di HP (sangat tajam untuk cetak) & hemat RAM HP
    const renderScale = isMobile ? 2 : 3; 

    // Deklarasi PDF lokal
    let pdfDoc = null;

    try {
        for (let i = 0; i < pages.length; i++) {
            const paperEl = pages[i];
            const prevTransform = paperEl.style.transform;
            
            // Sembunyikan tombol aksi melayang (kopi, hapus, putar)
            paperEl.style.transform = 'none'; 
            paperEl.querySelectorAll('.photo-actions').forEach(el => el.style.display = 'none');

            // Render ke Canvas
            let canvas = await html2canvas(paperEl, { 
                scale: renderScale, 
                useCORS: true, 
                backgroundColor: '#ffffff', 
                logging: false 
            });

            // Kembalikan Tampilan UI Halaman
            paperEl.querySelectorAll('.photo-actions').forEach(el => el.style.display = '');
            paperEl.style.transform = prevTransform;

            if (tipe === 'JPEG') {
                const timeStamp = Date.now();
                const fileName = `CetakFoto_Hal-${i + 1}_${timeStamp}.jpg`;

                // Buat Blob Gambar
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                if (!blob) continue;

                // Model Web Share API untuk Android
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Simpan / Bagikan Gambar',
                            text: `Cetak Foto Halaman ${i + 1}`
                        });
                    } catch (shareErr) {
                        // Jika dibatalkan user, fallback ke download biasa
                        unduhBlobOtomatis(blob, fileName);
                    }
                } else {
                    unduhBlobOtomatis(blob, fileName);
                }

                if (pages.length > 1) {
                    await new Promise(r => setTimeout(r, 400));
                }

            } else if (tipe === 'PDF') {
                const imgData = canvas.toDataURL('image/jpeg', 0.90); // Gunakan kompresi 0.90 agar RAM aman
                const isLandscape = canvas.width > canvas.height;
                const { jsPDF } = window.jspdf;

                if (i === 0) {
                    pdfDoc = new jsPDF({ 
                        orientation: isLandscape ? 'l' : 'p', 
                        unit: 'px', 
                        format: [canvas.width, canvas.height], 
                        compress: true 
                    });
                } else {
                    pdfDoc.addPage([canvas.width, canvas.height], isLandscape ? 'l' : 'p');
                }
                
                pdfDoc.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
            }

            // BEBASKAN MEMORI CANVAS (Kunci Utama Agar Android Tidak Macet)
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
            canvas = null;
        }

        // EKSPOR DAN BERSIHKAN MEMORI PDF
        if (tipe === 'PDF' && pdfDoc) {
            const pdfBlob = pdfDoc.output('blob');
            const fileName = `CetakFoto_${Date.now()}.pdf`;

            // Coba Web Share API untuk PDF di Android
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                    await navigator.share({
                        files: [pdfFile],
                        title: 'Simpan / Cetak PDF',
                        text: 'File Siap Cetak'
                    });
                } catch (e) {
                    unduhBlobOtomatis(pdfBlob, fileName);
                }
            } else {
                unduhBlobOtomatis(pdfBlob, fileName);
            }

            // Hancurkan referensi PDF
            pdfDoc = null;
        }

    } catch (error) {
        console.error("Gagal melakukan ekspor:", error);
        alert("Terjadi kesalahan saat memproses ekspor. Silakan coba lagi.");
    } finally {
        // Jaminan UI tombol tindakan kembali normal
        pages.forEach(paperEl => {
            paperEl.querySelectorAll('.photo-actions').forEach(el => el.style.display = '');
        });
    }
}

// Fungsi Helper Pengunduhan Blob yang Bersih
function unduhBlobOtomatis(blob, fileName) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        if (document.body.contains(link)) {
            document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
    }, 500);
}

// FUNGSI HITUNG GAMBAR (Hybrid Layout)
function hitungKapasitasOtomatis() {
    if (halamanAktif !== 'hitunggambar') return;
    const paperDim = getPaperDimensions('hitunggambar', document.getElementById('calcPaperSize')?.value || 'a4');
    const fotoW = (parseFloat(document.getElementById('calcFotoW')?.value) || 0) * 10;
    const fotoH = (parseFloat(document.getElementById('calcFotoH')?.value) || 0) * 10;
    const gap = parseFloat(document.getElementById('calcGap')?.value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin')?.value) || 0;
    const shape = document.getElementById('calcShape')?.value || 'rect';
    
    const rCount = document.getElementById('resultCount');
    const rDetail = document.getElementById('resultDetail');
    
    if (fotoW <= 0 || fotoH <= 0) { if(rCount) rCount.textContent = "0 Foto"; return; }
    const effW = paperDim.w - (2 * margin), effH = paperDim.h - (2 * margin);
    if (effW <= 0 || effH <= 0) { if(rCount) rCount.textContent = "0 Foto"; return; }
    
    const colsA = Math.floor((effW + gap) / (fotoW + gap)), rowsA = Math.floor((effH + gap) / (fotoH + gap));
    const totalA_main = Math.max(0, colsA) * Math.max(0, rowsA);
    const sisaH_A = effH - (rowsA * fotoH + (rowsA > 0 ? (rowsA - 1) * gap : 0)) - (rowsA > 0 ? gap : 0);
    let totalA_extra = 0, colsA_e = 0, rowsA_e = 0;
    if (sisaH_A >= fotoW && totalA_main > 0) { colsA_e = Math.floor((effW + gap)/(fotoH + gap)); rowsA_e = Math.floor((sisaH_A + gap)/(fotoW + gap)); totalA_extra = Math.max(0, colsA_e) * Math.max(0, rowsA_e); }
    const totalA = totalA_main + totalA_extra;
    
    const colsB = Math.floor((effW + gap) / (fotoH + gap)), rowsB = Math.floor((effH + gap) / (fotoW + gap));
    const totalB_main = Math.max(0, colsB) * Math.max(0, rowsB);
    const sisaH_B = effH - (rowsB * fotoW + (rowsB > 0 ? (rowsB - 1) * gap : 0)) - (rowsB > 0 ? gap : 0);
    let totalB_extra = 0, colsB_e = 0, rowsB_e = 0;
    if (sisaH_B >= fotoH && totalB_main > 0) { colsB_e = Math.floor((effW + gap)/(fotoW + gap)); rowsB_e = Math.floor((sisaH_B + gap)/(fotoW + gap)); totalB_extra = Math.max(0, colsB_e) * Math.max(0, rowsB_e); }
    const totalB = totalB_main + totalB_extra;
    
    let L = totalA >= totalB ? { t: totalA, mc: totalA_main, mw: fotoW, mh: fotoH, ec: totalA_extra, ew: fotoH, eh: fotoW } : { t: totalB, mc: totalB_main, mw: fotoH, mh: fotoW, ec: totalB_extra, ew: fotoW, eh: fotoH };
    
    if(rCount) rCount.textContent = `${L.t} Foto`;
    if(rDetail) rDetail.textContent = L.ec > 0 ? `${L.mc} Foto Utama + ${L.ec} Sisa` : `${L.mc} Foto Terisi`;
    renderSimulasiVisualCalc(paperDim.w, paperDim.h, margin, gap, shape, L);
}

function renderSimulasiVisualCalc(pW, pH, margin, gap, shape, L) {
    const workspace = document.getElementById('workspaceCalc');
    if(!workspace) return;
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

async function hapusCacheAplikasi() {
    const konfirmasi = confirm("Apakah kamu yakin ingin membersihkan cache? Aplikasi akan dimuat ulang untuk mengambil pembaruan file terbaru dari server.");
    if (!konfirmasi) return;

    try {
        // 1. Hapus semua Cache Storage PWA
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => {
                    console.log('Menghapus cache storage:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }

        // 2. Unregister / Copot Service Worker yang sedang berjalan
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log('Service Worker berhasil dilepas.');
            }
        }

        // 3. Bersihkan memori penyimpan data lokal
        localStorage.clear();
        sessionStorage.clear();

        alert("Cache berhasil dibersihkan! Seluruh file baru akan diambil dari server.");

        // 4. Paksa browser reload LANGSUNG dari server (Bypass Cache dengan Timestamp)
        const timestamp = new Date().getTime();
        window.location.href = window.location.origin + window.location.pathname + '?v=' + timestamp;

    } catch (error) {
        console.error("Gagal membersihkan cache:", error);
        alert("Terjadi kesalahan saat membersihkan cache. Memuat ulang halaman...");
        window.location.reload(true);
    }
}