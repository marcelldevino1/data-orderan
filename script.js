// URL Google Script kamu
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzWiy_dDOfgYwdTCzgAfMVwJIhh-w-3tQYPCWkz76Wmkon216uE1p3vj4JwpJRD02IE/exec'; 

let orderData = [];

// ==========================================
// 1. FETCH DATA DARI GOOGLE SHEETS
// ==========================================
async function fetchData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const json = await response.json();
        if(json.result === 'success') {
            orderData = json.data;
            
            // Render kalau lagi di halaman orderan
            if (document.getElementById('tableBody')) renderTable();
            // Update widget & chart kalau lagi di halaman dashboard
            if (document.getElementById('tot-order')) updateDashboard();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (document.getElementById('tableBody')) {
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat data. Periksa koneksi internet.</td></tr>';
        }
    }
}

// ==========================================
// 2. RENDER TABEL ORDERAN
// ==========================================
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const displayData = [...orderData].reverse(); 
    
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

// ==========================================
// 3. UPDATE DASHBOARD & REMINDER
// ==========================================
function updateDashboard() {
    if (!document.getElementById('tot-order')) return;

    const total = orderData.length;
    const selesai = orderData.filter(o => o.status === 'SELESAI').length;
    const cancel = orderData.filter(o => o.status === 'CANCEL').length;
    const proses = total - selesai - cancel; 

    document.getElementById('tot-order').innerText = total;
    document.getElementById('tot-selesai').innerText = selesai;
    document.getElementById('tot-proses').innerText = proses;
    document.getElementById('tot-cancel').innerText = cancel;

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

    updateChartData();
}

// ==========================================
// 4. UPDATE GRAFIK CHART.JS
// ==========================================
function updateChartData() {
    if (!document.getElementById('orderChart')) return;

    let monthlyCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    orderData.forEach(order => {
        if (order.tanggal) {
            const tglStr = String(order.tanggal);
            let bulanIndex = -1;

            if (tglStr.includes('/')) {
                const parts = tglStr.split('/');
                if (parts.length >= 2) bulanIndex = parseInt(parts[1]) - 1; 
            } else {
                const dateObj = new Date(tglStr);
                if (!isNaN(dateObj)) bulanIndex = dateObj.getMonth(); 
            }
            
            if (bulanIndex >= 0 && bulanIndex <= 11) {
                monthlyCounts[bulanIndex]++;
            }
        }
    });

    const ctx = document.getElementById('orderChart').getContext('2d');

    if (window.myLineChart) {
        window.myLineChart.data.datasets[0].data = monthlyCounts;
        window.myLineChart.update();
    } else {
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

// ==========================================
// 5. FITUR SEARCH & FILTER
// ==========================================
window.filterTable = function() {
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
};

// ==========================================
// 6. MODAL (POP-UP) CONTROL
// ==========================================
window.openModal = function() { 
    document.getElementById('orderModal').style.display = 'flex'; 
    document.getElementById('formAction').value = 'aktif';
    document.getElementById('formId').value = Math.floor(Math.random() * 100000);
    document.getElementById('orderForm').reset();
    document.querySelector('#orderModal h2').innerText = 'Tambah Order Baru';
};
window.closeModal = function() { 
    document.getElementById('orderModal').style.display = 'none'; 
};

// ==========================================
// 7. EDIT & DELETE SECARA INSTAN (OPTIMISTIC UI)
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
    
    // Hapus instan di layar
    orderData = orderData.filter(o => o.id != id); 
    renderTable(); 
    updateDashboard(); 
    
    // Eksekusi background
    const formData = new FormData();
    formData.append('id', id);
    formData.append('aksi', 'hapus');
    fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
        .catch(err => console.error("Gagal hapus:", err));
};

// ==========================================
// 8. SUBMIT FORM INSTAN (OPTIMISTIC UI)
// ==========================================
const orderForm = document.getElementById('orderForm');
if(orderForm) {
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const action = document.getElementById('formAction').value || 'aktif';
        let id = document.getElementById('formId').value;
        if(action === 'aktif' && !id) id = Math.floor(Math.random() * 100000);

        const now = new Date();
        const produk = document.getElementById('formProduk').value;
        const status = document.getElementById('formStatus').value;
        
        const orderLama = orderData.find(o => o.id == id);
        const tglOrder = (action === 'edit' && orderLama) ? orderLama.tanggal : `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;

        // Update layar instan
        if (action === 'aktif') {
            orderData.push({ id: id, produk: produk, tanggal: tglOrder, status: status, aksi: 'aktif' });
        } else if (action === 'edit' && orderLama) {
            orderLama.produk = produk;
            orderLama.status = status;
        }

        renderTable();
        updateDashboard();
        closeModal();
        e.target.reset();

        // Eksekusi background
        const formData = new FormData();
        formData.append('id', id); 
        formData.append('produk', produk); 
        formData.append('tanggal', tglOrder);
        formData.append('status', status);
        formData.append('aksi', action);

        fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
            .catch(error => console.error("Gagal simpan:", error));
    });
}

// Panggil data pertama kali web dibuka
fetchData();
