// ==========================================
// EDIT & DELETE ORDER (VERSI INSTAN / OPTIMISTIC)
// ==========================================
window.editOrder = function(id) {
    const order = orderData.find(o => o.id == id);
    if (!order) return;
    
    document.getElementById('formAction').value = 'edit';
    document.getElementById('formId').value = order.id;
    document.getElementById('formProduk').value = order.produk || ''; 
    document.getElementById('formStatus').value = order.status || 'PENDING';
    
    document.querySelector('#orderModal h2').innerText = 'Edit Order';
    document.getElementById('orderModal').style.display = 'flex'; 
};

window.deleteOrder = function(id) {
    if(!confirm('Apakah Anda yakin ingin menghapus order ini?')) return;
    
    // 1. HAPUS SECARA INSTAN DI LAYAR
    orderData = orderData.filter(o => o.id != id); // Buang data dari array lokal
    if(document.getElementById('tableBody')) renderTable(); // Langsung render ulang tabel
    if(document.getElementById('tot-order')) updateDashboard(); // Langsung render ulang dashboard
    
    // 2. KIRIM PERINTAH HAPUS KE GOOGLE SHEETS DI BACKGROUND
    const formData = new FormData();
    formData.append('id', id);
    formData.append('aksi', 'hapus');
    
    fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
        .catch(err => console.error("Gagal menghapus di background:", err));
};

// ==========================================
// SUBMIT FORM CREATE/EDIT ORDER (VERSI INSTAN)
// ==========================================
const orderForm = document.getElementById('orderForm');
if(orderForm) {
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Ambil data dari form
        const action = document.getElementById('formAction').value || 'aktif';
        let id = document.getElementById('formId').value;
        if(action === 'aktif' && !id) {
            id = Math.floor(Math.random() * 100000);
        }

        const now = new Date();
        const produk = document.getElementById('formProduk').value;
        const status = document.getElementById('formStatus').value;
        
        const orderLama = orderData.find(o => o.id == id);
        const tglOrder = (action === 'edit' && orderLama) ? orderLama.tanggal : `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;

        // 1. UPDATE LAYAR SECARA INSTAN (Tipuan Mata)
        if (action === 'aktif') {
            // Langsung tambahkan ke data lokal
            orderData.push({ id: id, produk: produk, tanggal: tglOrder, status: status, aksi: 'aktif' });
        } else if (action === 'edit') {
            // Langsung ubah data lokal
            if (orderLama) {
                orderLama.produk = produk;
                orderLama.status = status;
            }
        }

        // Langsung render ulang tanpa nunggu loading!
        if(document.getElementById('tableBody')) renderTable();
        if(document.getElementById('tot-order')) updateDashboard();

        // Tutup Pop-up secepat kilat
        closeModal();
        e.target.reset();

        // 2. KIRIM DATA KE GOOGLE SHEETS DI BACKGROUND (Diam-diam)
        const formData = new FormData();
        formData.append('id', id); 
        formData.append('produk', produk); 
        formData.append('tanggal', tglOrder);
        formData.append('status', status);
        formData.append('aksi', action);

        fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
            .catch(error => alert("Ups, gagal menyimpan ke database secara background. Cek koneksi internetmu!"));
    });
}
