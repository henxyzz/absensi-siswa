const API_BASE = '/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');
let userType = localStorage.getItem('userType');

if (!token) {
  window.location.href = '/login';
}

const socket = io();

socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('attendance:new', (data) => {
  showNotification(`Absensi baru: ${data.studentName} - ${data.status}`);
  if (document.querySelector('#page-overview.active')) {
    loadDashboard();
  }
});

socket.on('permission:new', (data) => {
  showNotification(`Pengajuan baru: ${data.studentName} - ${data.type}`);
});

socket.on('whatsapp:connected', () => {
  updateWhatsAppStatus(true);
  showNotification('WhatsApp terhubung');
});

socket.on('whatsapp:disconnected', () => {
  updateWhatsAppStatus(false);
});

socket.on('whatsapp:pairing', (data) => {
  document.getElementById('pairingCodeSection').style.display = 'block';
  document.getElementById('pairingCode').textContent = data.code;
});

async function apiRequest(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...defaultOptions, ...options });
  const data = await response.json();

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
  }

  return data;
}

async function loadDashboard() {
  try {
    const data = await apiRequest('/admin/dashboard');
    if (data.success) {
      document.getElementById('totalStudents').textContent = data.data.statistics.totalStudents;
      document.getElementById('totalTeachers').textContent = data.data.statistics.totalTeachers;
      document.getElementById('totalClasses').textContent = data.data.statistics.totalClasses;
      document.getElementById('todayAttendance').textContent = data.data.statistics.todayAttendanceRecorded;

      document.getElementById('hadirCount').textContent = data.data.todayAttendance.hadir || 0;
      document.getElementById('izinCount').textContent = data.data.todayAttendance.izin || 0;
      document.getElementById('sakitCount').textContent = data.data.todayAttendance.sakit || 0;
      document.getElementById('alphaCount').textContent = data.data.todayAttendance.alpha || 0;

      const activityList = document.getElementById('activityList');
      if (data.data.recentActivities.length > 0) {
        activityList.innerHTML = data.data.recentActivities.map(activity => 
          `<li><strong>${activity.action}</strong>: ${activity.description} <small>(${new Date(activity.createdAt).toLocaleString('id-ID')})</small></li>`
        ).join('');
      } else {
        activityList.innerHTML = '<li>Belum ada aktivitas</li>';
      }
    }
  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

async function loadClasses() {
  try {
    const data = await apiRequest('/classes');
    const tbody = document.getElementById('classesTableBody');
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(cls => `
        <tr>
          <td>${cls.name}</td>
          <td>${cls.grade}</td>
          <td>${cls.major || '-'}</td>
          <td>${cls.homeroomTeacher?.fullName || '-'}</td>
          <td>${cls.academicYear}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editClass('${cls._id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteClass('${cls._id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">Belum ada data kelas</td></tr>';
    }
  } catch (error) {
    console.error('Load classes error:', error);
  }
}

async function loadTeachers() {
  try {
    const data = await apiRequest('/teachers');
    const tbody = document.getElementById('teachersTableBody');
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(teacher => `
        <tr>
          <td><img src="${teacher.profilePhoto || '/images/default-avatar.png'}" alt=""></td>
          <td>${teacher.nip}</td>
          <td>${teacher.fullName}</td>
          <td>${teacher.subjects?.join(', ') || '-'}</td>
          <td>${teacher.whatsappNumber}</td>
          <td><span class="badge-status ${teacher.isActive ? 'badge-active' : 'badge-inactive'}">${teacher.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editTeacher('${teacher._id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteTeacher('${teacher._id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Belum ada data guru</td></tr>';
    }
  } catch (error) {
    console.error('Load teachers error:', error);
  }
}

async function loadStudents() {
  try {
    const data = await apiRequest('/students');
    const tbody = document.getElementById('studentsTableBody');
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(student => `
        <tr>
          <td><img src="${student.profilePhoto || '/images/default-avatar.png'}" alt=""></td>
          <td>${student.nis}</td>
          <td>${student.fullName}</td>
          <td>${student.classId?.name || '-'}</td>
          <td>${student.whatsappNumber}</td>
          <td><span class="badge-status ${student.status === 'active' ? 'badge-active' : 'badge-inactive'}">${student.status}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editStudent('${student._id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Belum ada data siswa</td></tr>';
    }
  } catch (error) {
    console.error('Load students error:', error);
  }
}

async function loadPermissions() {
  try {
    const data = await apiRequest('/permissions');
    const tbody = document.getElementById('permissionsTableBody');
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(perm => `
        <tr>
          <td>${new Date(perm.createdAt).toLocaleDateString('id-ID')}</td>
          <td>${perm.studentId?.fullName || '-'}</td>
          <td>${perm.classId?.name || '-'}</td>
          <td>${perm.type.toUpperCase()}</td>
          <td>${new Date(perm.startDate).toLocaleDateString('id-ID')} - ${new Date(perm.endDate).toLocaleDateString('id-ID')}</td>
          <td>${perm.reason}</td>
          <td><span class="badge-status badge-${perm.status}">${perm.status}</span></td>
          <td>
            ${perm.status === 'pending' ? `
              <button class="btn btn-sm btn-success" onclick="approvePermission('${perm._id}')"><i class="fas fa-check"></i></button>
              <button class="btn btn-sm btn-danger" onclick="rejectPermission('${perm._id}')"><i class="fas fa-times"></i></button>
            ` : '-'}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="loading">Belum ada pengajuan</td></tr>';
    }
  } catch (error) {
    console.error('Load permissions error:', error);
  }
}

async function loadLogs() {
  try {
    const data = await apiRequest('/admin/audit-logs?limit=50');
    const tbody = document.getElementById('logsTableBody');
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(log => `
        <tr>
          <td>${new Date(log.createdAt).toLocaleString('id-ID')}</td>
          <td>${log.action}</td>
          <td>${log.entityType}</td>
          <td>${log.userName}</td>
          <td>${log.description}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Belum ada log</td></tr>';
    }
  } catch (error) {
    console.error('Load logs error:', error);
  }
}

async function loadWhatsAppStatus() {
  try {
    const data = await apiRequest('/whatsapp/status');
    if (data.success) {
      updateWhatsAppStatus(data.data.connected, data.data);
    }
  } catch (error) {
    console.error('Load WA status error:', error);
  }
}

function updateWhatsAppStatus(connected, data = {}) {
  const indicator = document.getElementById('waStatusIndicator');
  const statusText = document.getElementById('waStatusText');
  const connectBtn = document.getElementById('waConnectBtn');
  const disconnectBtn = document.getElementById('waDisconnectBtn');
  const pairingSection = document.getElementById('pairingCodeSection');

  if (connected) {
    indicator.className = 'status-indicator connected';
    statusText.textContent = 'Terhubung';
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'inline-flex';
    pairingSection.style.display = 'none';
  } else {
    indicator.className = 'status-indicator disconnected';
    statusText.textContent = data.status === 'pairing' ? 'Menunggu Pairing' : 'Tidak Terhubung';
    connectBtn.style.display = 'inline-flex';
    disconnectBtn.style.display = 'none';
  }

  if (data.pairingCode) {
    pairingSection.style.display = 'block';
    document.getElementById('pairingCode').textContent = data.pairingCode;
  }

  document.getElementById('waPhoneNumber').textContent = data.phoneNumber || '-';
  document.getElementById('waLastConnected').textContent = data.lastConnected ? new Date(data.lastConnected).toLocaleString('id-ID') : '-';
}

async function connectWhatsApp() {
  const phoneNumber = document.getElementById('waConnectNumber').value.trim();
  if (!phoneNumber) {
    alert('Masukkan nomor WhatsApp');
    return;
  }

  try {
    const data = await apiRequest('/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });

    if (data.success) {
      if (data.data.pairingCode) {
        document.getElementById('pairingCodeSection').style.display = 'block';
        document.getElementById('pairingCode').textContent = data.data.pairingCode;
      }
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Connect WA error:', error);
  }
}

async function disconnectWhatsApp() {
  if (!confirm('Yakin ingin memutuskan WhatsApp?')) return;

  try {
    const data = await apiRequest('/whatsapp/disconnect', { method: 'POST' });
    if (data.success) {
      updateWhatsAppStatus(false);
      document.getElementById('pairingCodeSection').style.display = 'none';
    }
  } catch (error) {
    console.error('Disconnect WA error:', error);
  }
}

async function sendTestMessage() {
  const to = document.getElementById('waTestNumber').value.trim();
  const message = document.getElementById('waTestMessage').value.trim();

  if (!to || !message) {
    alert('Nomor dan pesan wajib diisi');
    return;
  }

  try {
    const data = await apiRequest('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ to, message })
    });

    if (data.success) {
      alert('Pesan berhasil dikirim');
      document.getElementById('waTestMessage').value = '';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Send message error:', error);
  }
}

function showAddClassModal() {
  document.getElementById('modalTitle').textContent = 'Tambah Kelas';
  document.getElementById('modalBody').innerHTML = `
    <form id="addClassForm">
      <div class="form-group">
        <label>Nama Kelas</label>
        <input type="text" name="name" required placeholder="Contoh: X IPA 1">
      </div>
      <div class="form-group">
        <label>Tingkat</label>
        <select name="grade" required>
          ${[...Array(12)].map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Jurusan (opsional)</label>
        <input type="text" name="major" placeholder="Contoh: IPA">
      </div>
      <div class="form-group">
        <label>Tahun Ajaran</label>
        <input type="text" name="academicYear" required placeholder="Contoh: 2024/2025">
      </div>
      <button type="submit" class="btn btn-primary btn-full">Simpan</button>
    </form>
  `;

  document.getElementById('addClassForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData);
    body.grade = parseInt(body.grade);

    const data = await apiRequest('/classes', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (data.success) {
      closeModal();
      loadClasses();
      showNotification('Kelas berhasil ditambahkan');
    } else {
      alert(data.message);
    }
  };

  openModal();
}

async function deleteClass(id) {
  if (!confirm('Yakin ingin menghapus kelas ini?')) return;
  const data = await apiRequest(`/classes/${id}`, { method: 'DELETE' });
  if (data.success) {
    loadClasses();
    showNotification('Kelas berhasil dihapus');
  } else {
    alert(data.message);
  }
}

async function approvePermission(id) {
  if (!confirm('Setujui pengajuan ini?')) return;
  const data = await apiRequest(`/permissions/${id}/approve`, { method: 'PUT' });
  if (data.success) {
    loadPermissions();
    showNotification('Pengajuan disetujui');
  } else {
    alert(data.message);
  }
}

async function rejectPermission(id) {
  const reason = prompt('Alasan penolakan:');
  if (!reason) return;
  const data = await apiRequest(`/permissions/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason })
  });
  if (data.success) {
    loadPermissions();
    showNotification('Pengajuan ditolak');
  } else {
    alert(data.message);
  }
}

function openModal() {
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function showNotification(message) {
  const badge = document.getElementById('notificationBadge');
  badge.textContent = parseInt(badge.textContent) + 1;
  console.log('Notification:', message);
}

const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const page = item.dataset.page;
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById('pageTitle').textContent = item.querySelector('span').textContent;

    switch (page) {
      case 'overview': loadDashboard(); break;
      case 'classes': loadClasses(); break;
      case 'teachers': loadTeachers(); break;
      case 'students': loadStudents(); break;
      case 'permissions': loadPermissions(); break;
      case 'whatsapp': loadWhatsAppStatus(); break;
      case 'logs': loadLogs(); break;
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login';
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('active');
});

document.getElementById('userName').textContent = user.fullName || 'Admin';

loadDashboard();
