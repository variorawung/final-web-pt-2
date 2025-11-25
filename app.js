// tiny inline SVG logo (data URL)
const APP_LOGO_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%23347" stroke-width="1.2">
<rect x="2" y="3" width="20" height="18" rx="2" ry="2" fill="%23fff" stroke="%23347"/>
<path d="M7 8h10M7 12h6" stroke="%23347" stroke-linecap="round"/>
</svg>`);

// inject minimal CSS for shake animation (only inject once)
(function injectHelpersCSS(){
    if (document.getElementById('app-js-helper-css')) return;
    const css = `
    .shake { animation: shake-anim 0.5s; }
    @keyframes shake-anim {
    0% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
    100% { transform: translateX(0); }
    }
    `;
    const style = document.createElement('style');
    style.id = 'app-js-helper-css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
})();

// small sound cues using WebAudio API
function playSound(type = 'success') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);

        if (type === 'success') {
            o.frequency.value = 880; // A5
            g.gain.value = 0.02;
        } else if (type === 'error') {
            o.frequency.value = 220;
            g.gain.value = 0.03;
        } else if (type === 'confirm') {
            o.frequency.value = 440;
            g.gain.value = 0.02;
        } else {
            o.frequency.value = 440;
            g.gain.value = 0.02;
        }

        o.type = 'sine';
        o.start();
        setTimeout(() => {
            o.stop();
            ctx.close();
        }, 150);
    } catch (e) {
        // audio might be blocked on some browsers until user interaction
        // ignore silently
        console.warn('playSound error', e);
    }
}

// convenience: small loading modal
function showLoadingSwal(message = 'Sedang Diproses') {
    if (typeof Swal === 'undefined') return; // SweetAlert2 not loaded
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

// database

function setupDatabase() {
    // Cek apakah data mahasiswa sudah ada
    if (!localStorage.getItem('mahasiswa')) {
        let dummyMahasiswa = [
            // buat 1 admin dan 2 mahasiswa
            { 
                nim: 'admin', 
                nama: 'Warek Kemahasiswaan', 
                password: 'admin', 
                role: 'admin' 
            },
            { 
                nim: '123456', 
                nama: 'Lionel Messi', 
                password: '1', 
                role: 'mahasiswa',
                jurusan: 'Teknik Informatika'
            },
            { 
                nim: '654321', 
                nama: 'Cristiano Ronaldo', 
                password: '1', 
                role: 'mahasiswa',
                jurusan: 'Sistem Informasi'
            }
        ];
        localStorage.setItem('mahasiswa', JSON.stringify(dummyMahasiswa));
    }

    // Cek apakah data master pelanggaran sudah ada
    if (!localStorage.getItem('master_pelanggaran')) {
        let dummyPelanggaran = [
            { id: 1, nama: 'Sabbath', poin: 20 },
            { id: 2, nama: 'Mid Week Prayer', poin: 5 },
            { id: 3, nama: 'Vesper', poin: 10 },
            { id: 4, nama: 'PA', poin: 5 }
        ];
        localStorage.setItem('master_pelanggaran', JSON.stringify(dummyPelanggaran));
    }

    // Cek apakah data log pelanggaran sudah ada
    if (!localStorage.getItem('log_pelanggaran')) {
        let dummyLogs = [
            { 
                id_log: 1, 
                nim: '123456', 
                id_pelanggaran: 2, 
                tanggal: '2025-10-10', 
                keterangan: 'Tidak hadir Mid Week Prayer' 
            }
        ];
        localStorage.setItem('log_pelanggaran', JSON.stringify(dummyLogs));
    }

    // Cek apakah data log keluhan sudah ada
    if (!localStorage.getItem('log_keluhan')) {
        localStorage.setItem('log_keluhan', JSON.stringify([]));
    }
}
setupDatabase();

// -------------------- Auth helpers --------------------

function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('currentUser'));
}

// -------------------- Login (enhanced with Swal) --------------------
function handleLogin() {
    const nimEl = document.getElementById('nim');
    const passwordEl = document.getElementById('password');
    const errorEl = document.getElementById('error-message');
    const loginBtn = document.getElementById('loginButton');

    // simple validation
    if (!nimEl || !passwordEl) {
        // fallback: if elements not found, inform developer
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.removeAttribute('aria-busy');
        }
        alert('Elemen username/password tidak ditemukan pada HTML.');
        return;
    }

    const nim = nimEl.value.trim();
    const password = passwordEl.value;

    // validation: empty inputs
    if (nim === '' || password === '') {
        if (errorEl) {
            errorEl.textContent = '';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.removeAttribute('aria-busy');
        }
        // shake container for feedback
        const loginBox = document.querySelector('.login-box') || document.body;
        loginBox.classList.add('shake');
        setTimeout(() => loginBox.classList.remove('shake'), 600);

        playSound('error');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Data Kosong',
                text: 'NIM dan Password wajib diisi.',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true
            });
        }
        return;
    }

    // set button loading state
    if (loginBtn) {
        try {
            loginBtn.dataset._orig = loginBtn.innerHTML;
            loginBtn.innerHTML = 'Loading...';
            loginBtn.disabled = true;
            loginBtn.setAttribute('aria-busy', 'true');
        } catch (e) { /* ignore */ }
    }

    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const user = users.find(u => u.nim === nim && u.password === password);

    // show loading
    if (typeof Swal !== 'undefined') showLoadingSwal('Mengecek...');

    setTimeout(() => { // small delay to simulate processing & allow loading modal to be visible
        if (typeof Swal !== 'undefined') Swal.close();

        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            playSound('success');

            // success popup with logo + timer progress bar
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Login Berhasil!',
                    text: `Selamat datang, ${user.nama}`,
                    imageUrl: APP_LOGO_SVG,
                    imageWidth: 80,
                    imageHeight: 80,
                    icon: 'success',
                    timer: 1400,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    backdrop: true
                }).then(() => {
                    if (user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                });
            } else {
                // fallback redirect
                if (user.role === 'admin') window.location.href = 'admin.html';
                else window.location.href = 'dashboard.html';
            }
        } else {
            playSound('error');

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Gagal!',
                    text: 'NIM atau password salah.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                if (errorEl) errorEl.textContent = 'NIM atau Password salah!';
            }

            // shake effect
            const loginBox = document.querySelector('.login-box') || document.body;
            loginBox.classList.add('shake');
            setTimeout(() => loginBox.classList.remove('shake'), 600);

            // restore button state
            if (loginBtn) {
                try {
                    loginBtn.disabled = false;
                    if (loginBtn.dataset._orig) loginBtn.innerHTML = loginBtn.dataset._orig;
                    loginBtn.removeAttribute('aria-busy');
                } catch (e) { /* ignore */ }
            }
        }
    }, 700);
}

// -------------------- Logout (enhanced with Swal confirmation) --------------------
function handleLogout() {
    if (typeof Swal === 'undefined') {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
        return;
    }

    playSound('confirm');
    Swal.fire({
        title: 'Logout?',
        text: 'Anda akan keluar dari sesi ini.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, logout',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('currentUser');
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Logout',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'index.html';
            });
        }
    });
}

// -------------------- Keluhan (enhanced with Swal) --------------------
function handleSimpanKeluhan() {
    const keluhanTextEl = document.getElementById('keluhan-text');
    const buktiInput = document.getElementById('keluhan-bukti');
    const successMsg = document.getElementById('keluhan-success');
    const user = getCurrentUser();

    if (!user) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Tidak terautentikasi',
                text: 'Silakan login terlebih dahulu.',
            });
        }
        return;
    }

    const keluhanText = keluhanTextEl ? keluhanTextEl.value.trim() : '';

    if (keluhanText === '') {
        // shake & error
        const box = keluhanTextEl ? keluhanTextEl.parentElement : document.body;
        box && box.classList.add('shake');
        setTimeout(() => box && box.classList.remove('shake'), 600);
        playSound('error');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Keluhan kosong',
                text: 'Tulis keluhan terlebih dahulu.',
                timer: 1800,
                showConfirmButton: false,
                timerProgressBar: true
            });
        }
        return;
    }

    // ambil nama bukti file jika ada
    let namaFileBukti = '';
    if (buktiInput && buktiInput.files.length > 0) {
        namaFileBukti = buktiInput.files[0].name;
    }

    // ambil db
    const allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
    const newKeluhanId = allKeluhan.length + 1;
    const tanggalHariIni = new Date().toISOString().split('T')[0];

    const newKeluhan = {
        id_keluhan: newKeluhanId,
        nim: user.nim,
        nama: user.nama,
        tanggal: tanggalHariIni,
        keluhan: keluhanText,
        bukti: namaFileBukti,
        status: 'Baru'
    };

    allKeluhan.push(newKeluhan);
    localStorage.setItem('log_keluhan', JSON.stringify(allKeluhan));

    playSound('success');
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Keluhan terkirim!',
            text: 'Terima kasih telah menyampaikan keluhan.',
            icon: 'success',
            timer: 1400,
            showConfirmButton: false,
            timerProgressBar: true
        });
    }

    // clear form
    if (keluhanTextEl) keluhanTextEl.value = '';
    if (buktiInput) buktiInput.value = '';
    if (successMsg) {
        successMsg.textContent = 'Keluhan berhasil terkirim!';
        setTimeout(()=> successMsg.textContent = '', 2000);
    }
}

// -------------------- Delete Poin (admin) --------------------
function handleDeletePoin(log_id_to_delete) {
    if (typeof Swal === 'undefined') {
        // fallback: confirm()
        if (!confirm('Anda yakin ingin menghapus poin ini secara permanen?')) return false;
        let allLogs = JSON.parse(localStorage.getItem('log_pelanggaran')) || [];
        const updatedLogs = allLogs.filter(log => log.id_log !== log_id_to_delete);
        localStorage.setItem('log_pelanggaran', JSON.stringify(updatedLogs));
        alert('Poin berhasil dihapus.');
        return true;
    }

    playSound('confirm');
    return Swal.fire({
        title: 'Hapus Poin?',
        text: 'Poin ini akan dihapus permanen.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (result.isConfirmed) {
            let allLogs = JSON.parse(localStorage.getItem('log_pelanggaran')) || [];
            const updatedLogs = allLogs.filter(log => log.id_log !== log_id_to_delete);
            localStorage.setItem('log_pelanggaran', JSON.stringify(updatedLogs));

            playSound('success');
            Swal.fire({
                icon: 'success',
                title: 'Poin berhasil dihapus',
                timer: 1200,
                showConfirmButton: false,
                timerProgressBar: true
            });
            return true;
        }
        return false;
    });
}

// -------------------- Delete Keluhan (admin) --------------------
function handleDeleteKeluhan(keluhan_id_to_delete) {
    if (typeof Swal === 'undefined') {
        if (!confirm('Anda yakin ingin menghapus keluhan ini?')) return false;
        let allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
        const updatedKeluhan = allKeluhan.filter(k => k.id_keluhan !== keluhan_id_to_delete);
        localStorage.setItem('log_keluhan', JSON.stringify(updatedKeluhan));
        alert('Keluhan berhasil dihapus.');
        return true;
    }

    playSound('confirm');
    return Swal.fire({
        title: 'Hapus Keluhan?',
        text: 'Keluhan ini akan dihapus.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal'
    }).then(result => {
        if (result.isConfirmed) {
            let allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
            const updatedKeluhan = allKeluhan.filter(k => k.id_keluhan !== keluhan_id_to_delete);
            localStorage.setItem('log_keluhan', JSON.stringify(updatedKeluhan));

            playSound('success');
            Swal.fire({
                icon: 'success',
                title: 'Keluhan berhasil dihapus',
                timer: 1200,
                showConfirmButton: false,
                timerProgressBar: true
            });
            return true;
        }
        return false;
    });
}

// -------------------- Exports / make them global for HTML onclick handlers --------------------
// If your HTML calls these functions via onclick attributes, they must be available on window
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.handleSimpanKeluhan = handleSimpanKeluhan;
window.handleDeletePoin = handleDeletePoin;
window.handleDeleteKeluhan = handleDeleteKeluhan;

// -------------------- Reply Keluhan (admin -> mahasiswa inbox) --------------------
function handleReplyKeluhan(keluhan_id, replyText) {
    const allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
    const idx = allKeluhan.findIndex(k => k.id_keluhan === keluhan_id);
    if (idx === -1) {
        alert('Keluhan tidak ditemukan.');
        return false;
    }

    const kel = allKeluhan[idx];

    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const uidx = users.findIndex(u => u.nim === kel.nim);
    if (uidx === -1) {
        alert('Mahasiswa penerima tidak ditemukan.');
        return false;
    }

    const admin = getCurrentUser();
    const now = new Date().toISOString();

    // push message to student's inbox
    const student = users[uidx];
    student.inbox = student.inbox || [];
    // mark new message as unread
    student.inbox.push({ from: admin ? admin.nama : 'Admin', text: replyText, tanggal: now, keluhan_id, read: false });

    // save users back
    users[uidx] = student;
    localStorage.setItem('mahasiswa', JSON.stringify(users));

    // update keluhan with reply info
    kel.replies = kel.replies || [];
    kel.replies.push({ responder: admin ? admin.nama : 'Admin', text: replyText, tanggal: now });
    kel.status = 'Ditanggapi';
    allKeluhan[idx] = kel;
    localStorage.setItem('log_keluhan', JSON.stringify(allKeluhan));

    playSound('success');
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'success', title: 'Balasan terkirim', timer: 1300, showConfirmButton: false });
    }

    return true;
}

window.handleReplyKeluhan = handleReplyKeluhan;

// -------------------- Student Inbox API --------------------
function getInbox() {
    const user = getCurrentUser();
    if (!user) return [];
    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const student = users.find(u => u.nim === user.nim);
    if (!student) return [];
    return student.inbox || [];
}

function markInboxMessageRead(index) {
    const user = getCurrentUser();
    if (!user) return false;
    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const uidx = users.findIndex(u => u.nim === user.nim);
    if (uidx === -1) return false;
    const student = users[uidx];
    student.inbox = student.inbox || [];
    if (index < 0 || index >= student.inbox.length) return false;
    student.inbox[index].read = true;
    users[uidx] = student;
    localStorage.setItem('mahasiswa', JSON.stringify(users));
    return true;
}

function markAllInboxRead() {
    const user = getCurrentUser();
    if (!user) return false;
    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const uidx = users.findIndex(u => u.nim === user.nim);
    if (uidx === -1) return false;
    const student = users[uidx];
    student.inbox = (student.inbox || []).map(m => ({ ...m, read: true }));
    users[uidx] = student;
    localStorage.setItem('mahasiswa', JSON.stringify(users));
    return true;
}

window.getInbox = getInbox;
window.markInboxMessageRead = markInboxMessageRead;
window.markAllInboxRead = markAllInboxRead;

// Return count of unread messages for current logged-in student
function getUnreadCount() {
    const inbox = getInbox();
    if (!inbox || !inbox.length) return 0;
    return inbox.reduce((cnt, m) => cnt + (m.read ? 0 : 1), 0);
}

window.getUnreadCount = getUnreadCount;

// -------------------- Inbox watcher + toast notifications --------------------
function startInboxWatcher(pollMs = 5000) {
    let lastCount = -1;
    function check() {
        try {
            const user = getCurrentUser && getCurrentUser();
            if (!user || user.role !== 'mahasiswa') { lastCount = -1; return; }
            const count = (typeof getUnreadCount === 'function') ? getUnreadCount() : 0;
            if (lastCount === -1) lastCount = count; // initialize without notifying
            if (count > lastCount) {
                // new messages arrived
                try { playSound('confirm'); } catch (e) {}
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Anda menerima pesan baru dari admin',
                        showConfirmButton: false,
                        timer: 4000,
                        timerProgressBar: true
                    });
                }
            }
            lastCount = count;
        } catch (e) {
            // ignore errors
        }
    }
    // run immediately then on interval
    check();
    const id = setInterval(check, pollMs);
    return function stop() { clearInterval(id); };
}

window.startInboxWatcher = startInboxWatcher;

// -------------------- Delete Inbox Message --------------------
function deleteInboxMessage(index) {
    const user = getCurrentUser();
    if (!user) return false;
    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const uidx = users.findIndex(u => u.nim === user.nim);
    if (uidx === -1) return false;
    const student = users[uidx];
    student.inbox = student.inbox || [];
    if (index < 0 || index >= student.inbox.length) return false;
    student.inbox.splice(index, 1);
    users[uidx] = student;
    localStorage.setItem('mahasiswa', JSON.stringify(users));
    return true;
}

window.deleteInboxMessage = deleteInboxMessage;

// -------------------- Delete Reply from Keluhan (admin) --------------------
function deleteReply(keluhan_id, reply_index) {
    const allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
    const kel_idx = allKeluhan.findIndex(k => k.id_keluhan === keluhan_id);
    if (kel_idx === -1) return false;
    const kel = allKeluhan[kel_idx];
    kel.replies = kel.replies || [];
    if (reply_index < 0 || reply_index >= kel.replies.length) return false;
    kel.replies.splice(reply_index, 1);
    // jika tidak ada replies lagi, ubah status kembali jadi Baru
    if (kel.replies.length === 0) {
        kel.status = 'Baru';
    }
    allKeluhan[kel_idx] = kel;
    localStorage.setItem('log_keluhan', JSON.stringify(allKeluhan));
    return true;
}

window.deleteReply = deleteReply;

// -------------------- Student Reply to Admin Message --------------------
function handleStudentReplyToInbox(keluhan_id, replyText) {
    const user = getCurrentUser();
    if (!user) {
        alert('Anda belum login');
        return false;
    }

    const users = JSON.parse(localStorage.getItem('mahasiswa')) || [];
    const uidx = users.findIndex(u => u.nim === user.nim);
    if (uidx === -1) return false;

    const student = users[uidx];
    const now = new Date().toISOString();

    // Add reply to inbox under conversation
    student.inbox = student.inbox || [];
    
    // Find the main message for this keluhan_id
    const mainMsgIdx = student.inbox.findIndex(m => m.keluhan_id === keluhan_id);
    if (mainMsgIdx === -1) {
        alert('Pesan tidak ditemukan.');
        return false;
    }

    // Add this reply to the same keluhan_id conversation
    // Store as a reply within the conversation
    if (!student.inbox[mainMsgIdx].replies) {
        student.inbox[mainMsgIdx].replies = [];
    }
    student.inbox[mainMsgIdx].replies.push({
        from: user.nama,
        text: replyText,
        tanggal: now
    });

    // Also update the keluhan log with student's reply
    const allKeluhan = JSON.parse(localStorage.getItem('log_keluhan')) || [];
    const kelIdx = allKeluhan.findIndex(k => k.id_keluhan === keluhan_id);
    if (kelIdx !== -1) {
        const kel = allKeluhan[kelIdx];
        kel.replies = kel.replies || [];
        kel.replies.push({
            responder: user.nama,
            text: replyText,
            tanggal: now,
            from_student: true
        });
        allKeluhan[kelIdx] = kel;
        localStorage.setItem('log_keluhan', JSON.stringify(allKeluhan));
    }

    users[uidx] = student;
    localStorage.setItem('mahasiswa', JSON.stringify(users));

    playSound('success');
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'success', title: 'Balasan terkirim', timer: 1300, showConfirmButton: false });
    }

    return true;
}

window.handleStudentReplyToInbox = handleStudentReplyToInbox;

// -------------------- Admin Management Helpers --------------------
function getUsers() {
    return JSON.parse(localStorage.getItem('mahasiswa') || '[]');
}
function saveUsers(users) {
    localStorage.setItem('mahasiswa', JSON.stringify(users || []));
}
function addUser(userObj) {
    const users = getUsers();
    const exists = users.find(u => u.nim === userObj.nim);
    if (exists) return false;
    users.push(userObj);
    saveUsers(users);
    return true;
}
function updateUser(nim, updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.nim === nim);
    if (idx === -1) return false;
    users[idx] = Object.assign({}, users[idx], updates);
    saveUsers(users);
    return true;
}
function deleteUser(nimToDelete) {
    const users = getUsers();
    const updated = users.filter(u => u.nim !== nimToDelete);
    if (updated.length === users.length) return false;
    saveUsers(updated);
    return true;
}

// expose
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.addUser = addUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;

// -------------------- Master Poin (pelanggaran) CRUD for Admin --------------------
function getMasterPelanggaran() {
    return JSON.parse(localStorage.getItem('master_pelanggaran') || '[]');
}
function saveMasterPelanggaran(arr) {
    localStorage.setItem('master_pelanggaran', JSON.stringify(arr || []));
}
function addMasterPelanggaran({ nama, poin }) {
    const arr = getMasterPelanggaran();
    const nextId = arr.reduce((max, p) => p.id > max ? p.id : max, 0) + 1;
    arr.push({ id: nextId, nama, poin: Number(poin) });
    saveMasterPelanggaran(arr);
    return true;
}
function updateMasterPelanggaran(id, updates) {
    const arr = getMasterPelanggaran();
    const idx = arr.findIndex(p => p.id === Number(id));
    if (idx === -1) return false;
    arr[idx] = Object.assign({}, arr[idx], updates);
    saveMasterPelanggaran(arr);
    return true;
}
function deleteMasterPelanggaran(id) {
    const arr = getMasterPelanggaran();
    const updated = arr.filter(p => p.id !== Number(id));
    if (updated.length === arr.length) return false;
    saveMasterPelanggaran(updated);
    return true;
}

window.getMasterPelanggaran = getMasterPelanggaran;
window.saveMasterPelanggaran = saveMasterPelanggaran;
window.addMasterPelanggaran = addMasterPelanggaran;
window.updateMasterPelanggaran = updateMasterPelanggaran;
window.deleteMasterPelanggaran = deleteMasterPelanggaran;

// -------------------- Admin messaging --------------------
function sendMessageToStudent(toNim, fromName, text) {
    const users = getUsers();
    const uidx = users.findIndex(u => u.nim === toNim);
    if (uidx === -1) return false;
    users[uidx].inbox = users[uidx].inbox || [];
    users[uidx].inbox.push({ from: fromName || 'Admin', text, tanggal: new Date().toISOString(), read: false });
    saveUsers(users);
    return true;
}
window.sendMessageToStudent = sendMessageToStudent;

// -------------------- Admin role management --------------------
function setUserRole(nim, role) {
    return updateUser(nim, { role });
}
window.setUserRole = setUserRole;

// -------------------- Admin update helpers for keluhan status --------------------
function setKeluhanStatus(keluhan_id, status) {
    const keluhan = JSON.parse(localStorage.getItem('log_keluhan') || '[]');
    const idx = keluhan.findIndex(k => k.id_keluhan === keluhan_id);
    if (idx === -1) return false;
    keluhan[idx].status = status;
    localStorage.setItem('log_keluhan', JSON.stringify(keluhan));
    return true;
}
window.setKeluhanStatus = setKeluhanStatus;
