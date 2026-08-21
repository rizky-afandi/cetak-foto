// file: js/editor.js

function resetFilterSliders() {
    const ids = ['cropZoomSlider', 'cropRotateSlider', 'cropBrightness', 'cropContrast', 'cropSaturate'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = id.includes('Zoom') ? defaultZoomRatio : (id.includes('Rotate') ? 0 : 100); });
    const rotVal = document.getElementById('rotateValue'); if (rotVal) rotVal.textContent = '0°';
    const stretchCheck = document.getElementById('cropStretchCheck'); if (stretchCheck) stretchCheck.checked = false;
    
    const cropImgEl = document.getElementById('cropImage'); if (cropImgEl) cropImgEl.style.filter = 'none';
    const cropperContainer = document.querySelector('.cropper-container'); if (cropperContainer) cropperContainer.style.filter = 'none';
}

function resetEditGambar() { if (cropper) cropper.reset(); resetFilterSliders(); }
function aturZoomModal(nilai) { if (cropper) cropper.zoomTo(parseFloat(nilai)); }
function aturRotasiModal(nilai) {
    if (!cropper) return;
    const deg = parseInt(nilai);
    cropper.rotateTo(deg);
    const rotVal = document.getElementById('rotateValue'); if (rotVal) rotVal.textContent = `${deg}°`;
}

function putarCepat(deg) {
    if (!cropper) return; cropper.rotate(deg);
    const slider = document.getElementById('cropRotateSlider');
    if (slider) {
        let newDeg = (parseInt(slider.value) + deg) % 360; slider.value = newDeg;
        const rotVal = document.getElementById('rotateValue'); if (rotVal) rotVal.textContent = `${newDeg}°`;
    }
}

function terapkanFilterModal() {
    const b = document.getElementById('cropBrightness')?.value || 100;
    const c = document.getElementById('cropContrast')?.value || 100;
    const s = document.getElementById('cropSaturate')?.value || 100;
    const filterString = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    const cropImgEl = document.getElementById('cropImage'); if (cropImgEl) cropImgEl.style.filter = filterString;
    const cropperContainer = document.querySelector('.cropper-container'); if (cropperContainer) cropperContainer.style.filter = filterString;
}

function tutupCropModal() {
    const cropModal = document.getElementById('cropModal');
    if (cropModal) { cropModal.classList.remove('active'); cropModal.style.display = 'none'; }
    if (cropper) { cropper.destroy(); cropper = null; }
    resetFilterSliders();
}

function bukaCropModal() {
    const cropModal = document.getElementById('cropModal');
    if (cropModal) { cropModal.classList.add('active'); cropModal.style.display = 'flex'; }
}

function toggleCropAspectMode() {
    if (!cropper) return;
    const isFreeRatio = document.getElementById('cropStretchCheck')?.checked;
    if (isFreeRatio) {
        cropper.setAspectRatio(NaN);
    } else {
        let p = dapatkanPengaturan(); let targetW = p.w_mm, targetH = p.h_mm;
        if (targetRecropElement && targetRecropElement.dataset.rotated === "true") { targetW = parseFloat(targetRecropElement.dataset.h_mm) || p.h_mm; targetH = parseFloat(targetRecropElement.dataset.w_mm) || p.w_mm; }
        if (targetW > 0 && targetH > 0) cropper.setAspectRatio(targetW / targetH);
    }
}

// UPLOAD LISTENER
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const cropImgEl = document.getElementById('cropImage'); if (!cropImgEl) return;
    if (cropImgEl.src && cropImgEl.src.startsWith('blob:')) URL.revokeObjectURL(cropImgEl.src);
    if (cropper) { cropper.destroy(); cropper = null; }
    resetFilterSliders();
    
    cropImgEl.onload = () => {
        bukaCropModal();
        setTimeout(() => {
            let p = dapatkanPengaturan();
            let cropperRatio = (p.w_mm > 0 && p.h_mm > 0) ? p.w_mm / p.h_mm : NaN;
            if (document.getElementById('cropStretchCheck')?.checked) cropperRatio = NaN;
            
            cropper = new Cropper(cropImgEl, {
                viewMode: 1, dragMode: 'move', autoCropArea: 1, aspectRatio: cropperRatio,
                responsive: true, restore: false, checkOrientation: false, zoomOnWheel: true, toggleDragModeOnDblclick: false,
                ready() {
                    terapkanFilterModal();
                    const imageData = cropper.getImageData();
                    if (imageData && imageData.naturalWidth > 0) {
                        defaultZoomRatio = imageData.width / imageData.naturalWidth;
                        const zs = document.getElementById('cropZoomSlider');
                        if (zs) { zs.min = defaultZoomRatio * 0.3; zs.max = defaultZoomRatio * 3.0; zs.step = (zs.max - zs.min)/100; zs.value = defaultZoomRatio; }
                    }
                },
                zoom(e) { const zs = document.getElementById('cropZoomSlider'); if (zs && e.detail) zs.value = e.detail.ratio; }
            });
        }, 100);
    };
    cropImgEl.src = URL.createObjectURL(file); fileInput.value = ""; 
});

function terapkanCrop() {
    if (!cropper) return;
    const initialCanvas = cropper.getCroppedCanvas({ imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
    if (!initialCanvas) return;
    
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = initialCanvas.width; filteredCanvas.height = initialCanvas.height;
    const ctx = filteredCanvas.getContext('2d');
    const b = document.getElementById('cropBrightness')?.value || 100;
    const c = document.getElementById('cropContrast')?.value || 100;
    const s = document.getElementById('cropSaturate')?.value || 100;
    
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    ctx.drawImage(initialCanvas, 0, 0);
    
    const newSrc = filteredCanvas.toDataURL('image/jpeg', 0.95);
    const isStretch = document.getElementById('cropStretchCheck')?.checked || false;
    const classNameBaru = isStretch ? 'stretch-on' : 'stretch-off';
    
    if (targetRecropElement) {
        let imgEl = targetRecropElement.querySelector('img');
        if (imgEl) { imgEl.src = newSrc; imgEl.className = classNameBaru; }
        targetRecropElement = null; reflowHalaman();
    } else {
        currentImgSrc = newSrc; currentImgClassName = classNameBaru;
        
        // --- KODE TAMBAHAN: OTOMATIS TAMPILKAN KE KERTAS ---
        // Setelah modal crop ditutup, otomatis panggil tombol "Tambah"
        setTimeout(() => {
            if (typeof aksiTambah === 'function') {
                aksiTambah();
            }
        }, 50);
    }
    tutupCropModal();
}

function batalCrop() { targetRecropElement = null; tutupCropModal(); }

// Event Listeners Filter
['input', 'change'].forEach(evt => {
    document.addEventListener(evt, (e) => {
        if (!e.target || e.target.type !== 'range') return;
        if (e.target.id === 'cropZoomSlider') aturZoomModal(e.target.value);
        else if (e.target.id === 'cropRotateSlider') aturRotasiModal(e.target.value);
        else if (['cropBrightness', 'cropContrast', 'cropSaturate'].includes(e.target.id)) terapkanFilterModal();
    });
});