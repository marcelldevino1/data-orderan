// URL Google Script kamu
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzWiy_dDOfgYwdTCzgAfMVwJIhh-w-3tQYPCWkz76Wmkon216uE1p3vj4JwpJRD02IE/exec'; 

let orderData = [];

// FETCH DATA DARI GOOGLE SHEETS
async function fetchData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const json = await response.json();
        if(json.result === 'success') {
            orderData = json.data;
            
            // Render table kalau lagi di halaman orderan.html
            if (document.getElementById('tableBody')) {
                renderTable();
            }
            
            // Update widget kalau lagi di halaman index.html
            if (document.getElementById('tot-order')) {
                updateDashboard();
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (document.getElementById('tableBody')) {
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;">Gagal memuat data. Periksa koneksi internet.</td></tr>';
        }
    }
}

// RENDER TABEL
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const displayData = [...orderData].reverse(); // Data terbaru di atas
    
    if (displayData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data orderan.</td></tr>';
        return;
    }

    displayData.forEach((order) => { 
        const badgeClass = order.status === 'SELESAI' ? 'bg-selesai' : 
                           order.status === 'PROSES' ? 'bg-proses' : 
                           order.status === 'CANCEL' ? 'bg-cancel' : 'bg-pending';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td>#${order.id || '-'}</td>
            <td>${order.produk || '-'}</td> 
            <td>${order.tanggal || '-'}</td>
            <td><span class="status-badge ${badgeClass}">${order.status || 'PENDING'}</span></td>
            <td>
                <button class="action-btn" title="Edit" onclick="editOrder('${order.id}')">✏️</button>
                <button class="action-btn" title="Hapus" onclick="deleteOrder('${order.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// UPDATE DASHBOARD WIDGETS & CHART
function updateDashboard() {
    // 1. Update Kartu Angka
    const total = orderData.length;
    const selesai = orderData.filter(o => o.status === 'SELESAI').length;
    const cancel = orderData.filter(o => o.status === 'CANCEL').length;
    const proses = total - selesai - cancel; 

    document.getElementById('tot-order').innerText = total;
    document.getElementById('tot-selesai').innerText = selesai;
    document.getElementById('tot-proses').innerText = proses;
    document.getElementById('tot-cancel').innerText = cancel;

    // 2. Update Reminder List
    const reminderList = document.getElementById('reminder-list');
    reminderList.innerHTML = '';
    
    const recentOrders = [...orderData].reverse().slice(0, 3);
    if(recentOrders.length === 0) {
         reminderList.innerHTML = '<li>Belum ada aktivitas.</li>';
    } else {
        recentOrders.forEach(o => {
            reminderList.innerHTML += `<li>Order <b>${o.produk}</b> - <span style="color:grey">${o.status}</span></li>`;
        });
    }

    // 3. PANGGIL FUNGSI UPDATE GRAFIK
    if (document.getElementById('orderChart')) {
        updateChartData();
    }
}

// FUNGSI KHUSUS UNTUK UPDATE DATA GRAFIK (Kebal Format Tanggal)
function updateChartData() {
    // Siapkan wadah angka untuk 12 bulan (Januari - Desember)
    let monthlyCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Cek setiap orderan
    orderData.forEach(order => {
        if (order.tanggal) {
            const tglStr = String(order.tanggal);
            let bulanIndex = -1;

            // 1. Kalau formatnya masih "DD/MM/YYYY" (ada garis miringnya)
            if (tglStr.includes('/')) {
                const parts = tglStr.split('/');
                if (parts.length >= 2) {
                    bulanIndex = parseInt(parts[1]) - 1; 
                }
            } 
            // 2. Kalau formatnya diam-diam diubah Google jadi "YYYY-MM-DD..."
            else {
                const dateObj = new Date(tglStr);
                // Pastikan bukan invalid date
                if (!isNaN(dateObj)) {
                    bulanIndex = dateObj.getMonth(); // getMonth otomatis kasih angka 0 (Jan) sampai 11 (Des)
                }
            }
            
            // Kalau bulannya ketemu, tambahkan hitungan
            if (bulanIndex >= 0 && bulanIndex <= 11) {
                monthlyCounts[bulanIndex]++;
            }
        }
    });

    const ctx = document.getElementById('orderChart').getContext('2d');

    // Kalau grafiknya sudah pernah dibuat, update datanya aja
    if (window.myLineChart) {
        window.myLineChart.data.datasets[0].data = monthlyCounts;
        window.myLineChart.update();
    } else {
        // Kalau grafiknya belum ada (pertama kali load web), bikin baru
        window.myLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{
                    label: 'Jumlah Orderan',
                    data: monthlyCounts, 
                    borderColor: '#333',
                    backgroundColor: 'rgba(51, 51, 51, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// FITUR FILTER & SEARCH
function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        if(row.cells.length < 6) return; 
        const id = row.cells[1].innerText.toLowerCase();
        const produk = row.cells[2].innerText.toLowerCase();
        const status = row.cells[4].innerText.toUpperCase();

        const matchSearch = produk.includes(searchText) || id.includes(searchText);
        const matchStatus = statusFilter === 'ALL' || status.includes(statusFilter);

        row.style.display = (matchSearch && matchStatus) ? '' : 'none';
    });
}

// BUKA TUTUP MODAL POP-UP
function openModal() { 
    document.getElementById('orderModal').style.display = 'flex'; 
    document.getElementById('formAction').value = 'aktif';
    document.getElementById('formId').value = Math.floor(Math.random() * 100000);
    document.getElementById('orderForm').reset();
    document.querySelector('#orderModal h2').innerText = 'Tambah Order Baru';
}
function closeModal() { 
    document.getElementById('orderModal').style.display = 'none'; 
}

// EDIT & DELETE ORDER
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

window.deleteOrder = async function(id) {
    if(!confirm('Apakah Anda yakin ingin menghapus order ini?')) return;
    
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;">Menghapus data...</td></tr>';
    
    const formData = new FormData();
    formData.append('id', id);
    formData.append('aksi', 'hapus');
    
    try {
        await fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData });
        await fetchData(); 
    } catch(err) {
        alert("Gagal menghapus data.");
        await fetchData();
    }
};

// SUBMIT FORM CREATE/EDIT ORDER
const orderForm = document.getElementById('orderForm');
if(orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.innerText = "Menyimpan...";
        btnSubmit.disabled = true;

        const formData = new FormData();
        const now = new Date();
        
        const action = document.getElementById('formAction').value || 'aktif';
        let id = document.getElementById('formId').value;
        if(action === 'aktif' && !id) {
            id = Math.floor(Math.random() * 100000);
        }

        formData.append('id', id); 
        formData.append('produk', document.getElementById('formProduk').value); 
        // Tanggal hanya dicatat saat buat baru. Kalau edit, kita tidak ubah tanggalnya (kecuali mau ditambahkan logika update tanggal)
        const orderLama = orderData.find(o => o.id == id);
        const tglOrder = (action === 'edit' && orderLama) ? orderLama.tanggal : `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
        
        formData.append('tanggal', tglOrder);
        formData.append('status', document.getElementById('formStatus').value);
        formData.append('aksi', action);

        try {
            await fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData });
            closeModal();
            e.target.reset(); 
            if(document.getElementById('tableBody')) {
                 document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;">Memperbarui data...</td></tr>';
            }
            await fetchData(); 
        } catch (error) {
            alert("Gagal menyimpan data! Periksa koneksi.");
        } finally {
            btnSubmit.innerText = "Simpan ke Sheets";
            btnSubmit.disabled = false;
        }
    });
}

// LOAD DATA PERTAMA KALI
fetchData();