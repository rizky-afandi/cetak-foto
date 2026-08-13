// file: js/kalkulator.js

// FUNGSI HITUNG GAMBAR (Hybrid Layout)
function hitungKapasitasOtomatis() {
    if (halamanAktif !== 'hitunggambar') return;

    const paperDim = getPaperDimensions('hitunggambar', document.getElementById('calcPaperSize')?.value || 'a4');
    const fotoW = (parseFloat(document.getElementById('calcFotoW')?.value) || 0) * 10; // cm -> mm
    const fotoH = (parseFloat(document.getElementById('calcFotoH')?.value) || 0) * 10; // cm -> mm
    const gap = parseFloat(document.getElementById('calcGap')?.value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin')?.value) || 0;
    const shape = document.getElementById('calcShape')?.value || 'rect';

    const rCount = document.getElementById('resultCount');
    const rDetail = document.getElementById('resultDetail');

    if (fotoW <= 0 || fotoH <= 0) { 
        if(rCount) rCount.textContent = "0 Foto"; 
        return; 
    }
    
    const effW = paperDim.w - (2 * margin);
    const effH = paperDim.h - (2 * margin);

    if (effW <= 0 || effH <= 0) { 
        if(rCount) rCount.textContent = "0 Foto"; 
        return; 
    }

    // Opsi A: Orientasi Tegak / Asli
    const colsA = Math.floor((effW + gap) / (fotoW + gap));
    const rowsA = Math.floor((effH + gap) / (fotoH + gap));
    const totalA_main = Math.max(0, colsA) * Math.max(0, rowsA);
    const sisaH_A = effH - (rowsA * fotoH + (rowsA > 0 ? (rowsA - 1) * gap : 0)) - (rowsA > 0 ? gap : 0);
    
    let totalA_extra = 0, colsA_e = 0, rowsA_e = 0;
    if (sisaH_A >= fotoW && totalA_main > 0) { 
        colsA_e = Math.floor((effW + gap)/(fotoH + gap)); 
        rowsA_e = Math.floor((sisaH_A + gap)/(fotoW + gap)); 
        totalA_extra = Math.max(0, colsA_e) * Math.max(0, rowsA_e); 
    }
    const totalA = totalA_main + totalA_extra;

    // Opsi B: Orientasi Miring / Putar 90 Derajat
    const colsB = Math.floor((effW + gap) / (fotoH + gap));
    const rowsB = Math.floor((effH + gap) / (fotoW + gap));
    const totalB_main = Math.max(0, colsB) * Math.max(0, rowsB);
    const sisaH_B = effH - (rowsB * fotoW + (rowsB > 0 ? (rowsB - 1) * gap : 0)) - (rowsB > 0 ? gap : 0);
    
    let totalB_extra = 0, colsB_e = 0, rowsB_e = 0;
    if (sisaH_B >= fotoH && totalB_main > 0) { 
        colsB_e = Math.floor((effW + gap)/(fotoW + gap)); 
        rowsB_e = Math.floor((sisaH_B + gap)/(fotoW + gap)); 
        totalB_extra = Math.max(0, colsB_e) * Math.max(0, rowsB_e); 
    }
    const totalB = totalB_main + totalB_extra;

    // Pilih Kombinasi Paling Banyak Dapat Foto
    let L = totalA >= totalB ? 
        { t: totalA, mc: totalA_main, mw: fotoW, mh: fotoH, ec: totalA_extra, ew: fotoH, eh: fotoW } : 
        { t: totalB, mc: totalB_main, mw: fotoH, mh: fotoW, ec: totalB_extra, ew: fotoW, eh: fotoH };

    // Tampilkan Hasil Teks
    if(rCount) rCount.textContent = `${L.t} Foto`;
    if(rDetail) rDetail.textContent = L.ec > 0 ? `${L.mc} Foto Utama + ${L.ec} Sisa Space` : `${L.mc} Foto Terisi Maksimal`;

    // Render Visual Kertas & Kotak Foto
    renderSimulasiVisualCalc(paperDim.w, paperDim.h, margin, gap, shape, L);
}

function renderSimulasiVisualCalc(pW, pH, margin, gap, shape, L) {
    const workspace = document.getElementById('workspaceCalc');
    if (!workspace) return;
    
    workspace.innerHTML = '';

    // Container Ukuran Kertas
    let cont = document.createElement('div'); 
    cont.className = 'page-container'; 
    cont.dataset.w = pW * PX_PER_MM; 
    cont.dataset.h = pH * PX_PER_MM;

    // Elemen Lembar Kertas
    let page = document.createElement('div'); 
    page.className = 'paper-page';
    page.style.width = `${pW * PX_PER_MM}px`; 
    page.style.height = `${pH * PX_PER_MM}px`; 
    page.style.padding = `${margin * PX_PER_MM}px`;
    page.style.display = 'flex'; 
    page.style.flexWrap = 'wrap'; 
    page.style.alignContent = 'flex-start'; 
    page.style.gap = `${gap * PX_PER_MM}px`;
    page.style.background = '#ffffff';
    page.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';

    // Render Kotak Foto Utama (Warna Ungu)
    let counter = 1;
    for (let i = 0; i < L.mc; i++) {
        page.appendChild(buatBoxVisualCalc(L.mw, L.mh, shape, counter++, '#E9D5FF', '#9333ea'));
    }

    // Render Kotak Foto Sisa Space (Warna Oranye)
    for (let j = 0; j < L.ec; j++) {
        page.appendChild(buatBoxVisualCalc(L.ew, L.eh, shape, counter++, '#FED7AA', '#ea580c'));
    }

    cont.appendChild(page); 
    workspace.appendChild(cont); 

    // Beri jeda kecil agar DOM sempat dirender sebelum zoom dihitung
    setTimeout(() => {
        if (typeof terapkanZoom === 'function') terapkanZoom();
    }, 50);
}

function buatBoxVisualCalc(w, h, shape, num, bg, border) {
    let box = document.createElement('div'); 
    box.style.width = `${w * PX_PER_MM}px`; 
    box.style.height = `${h * PX_PER_MM}px`;
    box.style.background = bg; 
    box.style.border = `1px solid ${border}`; 
    box.style.display = 'flex'; 
    box.style.alignItems = 'center'; 
    box.style.justifyContent = 'center'; 
    box.style.color = border; 
    box.style.fontWeight = 'bold';
    box.style.fontSize = '12px';
    box.textContent = num; 
    box.style.borderRadius = (shape === 'circle') ? '50%' : '3px'; 
    return box;
}