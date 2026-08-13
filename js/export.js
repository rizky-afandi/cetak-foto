// file: js/export.js

function toggleExportMenu(event, menuId) {
    event.stopPropagation();
    ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => {
        if(id === menuId) document.getElementById(id)?.classList.toggle('show'); else document.getElementById(id)?.classList.remove('show');
    });
}

function tutupSemuaMenu() { ['exportMenuPas', 'RataPas', 'exportMenuGrid', 'RataGrid', 'exportMenuCustom', 'RataCustom'].forEach(id => document.getElementById(id)?.classList.remove('show')); }
window.addEventListener('click', tutupSemuaMenu);

function unduhBlobOtomatis(blob, fileName) {
    const blobUrl = URL.createObjectURL(blob), link = document.createElement('a'); link.href = blobUrl; link.download = fileName;
    document.body.appendChild(link); link.click();
    setTimeout(() => { if (document.body.contains(link)) document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 500);
}

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