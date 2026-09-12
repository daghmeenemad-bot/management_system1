let schools = AppData.getSchools();
let secretaries = AppData.getSecretaries();
let currentSecretary = null;
let cloudRequests = [];

function populateSchools() {
    const schoolSelect = document.getElementById('school-name');
    const sharedSelect = document.getElementById('shared-school-name');
    
    schoolSelect.innerHTML = '<option value="">-- اختر المدرسة الأساسية --</option>';
    sharedSelect.innerHTML = '<option value="">-- اختر المدرسة المشتركة (اختياري) --</option>';
    
    schools.sort().forEach(s => {
        const opt1 = document.createElement('option');
        opt1.value = s; opt1.textContent = s;
        schoolSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = s; opt2.textContent = s;
        sharedSelect.appendChild(opt2);
    });
}

function loginSecretary() {
    const inputVal = document.getElementById('secretary-input').value.trim();
    if (!inputVal) { alert('⚠️ الرجاء إدخال رقم السكرتير أو اسمه.'); return; }

    let foundSec = secretaries.find(s => s.id === inputVal || s.name.includes(inputVal));
    if (!foundSec) {
        foundSec = { id: inputVal, name: inputVal };
    }

    currentSecretary = foundSec;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('secretary-dashboard').style.display = 'block';
    document.getElementById('welcome-text').innerText = `👋 أهلاً بك: ${currentSecretary.name} (رقم: ${currentSecretary.id})`;
}

async function submitRequest() {
    const schoolName = document.getElementById('school-name').value.trim();
    const sharedSchoolName = document.getElementById('shared-school-name').value.trim();
    const teacherName = document.getElementById('teacher-name').value.trim();
    const teacherId = document.getElementById('teacher-id').value.trim();
    const classes = document.getElementById('classes').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const specialization = document.getElementById('specialization').value.trim();
    const reason = document.getElementById('reason').value;

    if (!schoolName || !teacherName || !teacherId || !startDate || !endDate || !specialization) {
        alert('⚠️ الرجاء تعبئة جميع الحقول الأساسية.');
        return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = '⏳ جاري إرسال الطلب وحفظه في جوجل شيت...';

    const newReq = {
        action: 'add',
        id: 'REQ_' + Date.now(),
        secretaryName: currentSecretary.name,
        secretaryId: currentSecretary.id,
        schoolName,
        sharedSchoolName: sharedSchoolName || 'لا يوجد',
        teacherName, teacherId, classes, startDate, endDate, specialization, reason,
        status: 'قيد المراجعة',
        subName: '', subId: '', subPhone: '',
        timestamp: new Date().toLocaleString('ar-PS')
    };

    try {
        await AppData.addRequest(newReq);

        alert('✅ تم إرسال الطلب بنجاح إلى قسم الشؤون الإدارية وتوثيقه في جوجل شيت!');
        
        document.getElementById('teacher-name').value = '';
        document.getElementById('teacher-id').value = '';
        document.getElementById('classes').value = '';
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        document.getElementById('specialization').value = '';
        document.getElementById('shared-school-name').value = '';
    } catch (error) {
        console.error(error);
        alert('❌ حدث خطأ أثناء إرسال الطلب تأكد من صحة رابط جوجل شيت واتصال الإنترنت.');
    } finally {
        btn.disabled = false;
        btn.innerText = '📨 إرسال الطلب (إلى الشؤون الإدارية)';
    }
}

function showAdmin() {
    const pass = prompt('🔐 أدخل رمز المرور الخاص بقسم الشؤون الإدارية:');
    if (pass === '1978') {
        document.getElementById('admin-login-area').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminData();
    } else {
        alert('❌ رمز المرور غير صحيح.');
    }
}

function addNewSchool() {
    const name = document.getElementById('new-school-input').value.trim();
    if (!name) { alert('⚠️ اكتب اسم المدرسة الجديدة.'); return; }
    if (schools.includes(name)) { alert('⚠️ المدرسة موجودة مسبقاً.'); return; }
    
    schools.push(name);
    AppData.saveSchools(schools);
    populateSchools();
    alert('✅ تمت إضافة المدرسة بنجاح!');
    document.getElementById('new-school-input').value = '';
}

function addNewSecretary() {
    const name = document.getElementById('new-sec-name').value.trim();
    const id = document.getElementById('new-sec-id').value.trim();
    if (!name || !id) { alert('⚠️ تأكد من إدخال اسم السكرتير ورقم السكرتير/الهوية.'); return; }
    if (secretaries.some(s => s.id === id)) { alert('⚠️ رقم السكرتير موجود مسبقاً.'); return; }
    
    secretaries.push({ id, name });
    AppData.saveSecretaries(secretaries);
    alert('✅ تمت إضافة السكرتير بنجاح!');
    document.getElementById('new-sec-name').value = '';
    document.getElementById('new-sec-id').value = '';
}

async function loadAdminData() {
    const container = document.getElementById('admin-table-container');
    container.innerHTML = '<div class="loading">جاري جلب الطلبات من جوجل شيت...</div>';

    try {
        cloudRequests = await AppData.getRequests();

        if (!cloudRequests || cloudRequests.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد طلبات مسجلة حتى الآن.</p>';
            return;
        }

        let html = `<table><thead><tr><th>م</th><th>المدارس والسكرتير</th><th>المعلم المنقطع</th><th>التخصص والسبب</th><th>الفترة</th><th>الحالة</th><th>اسم البديل</th><th>هوية البديل</th><th>هاتف البديل</th><th>إجراء</th></tr></thead><tbody>`;

        cloudRequests.forEach((req, index) => {
            let dId = req.docId;
            let status = req.status || 'قيد المراجعة';

            html += `<tr>
                <td>${index + 1}</td>
                <td><b>الأساسية:</b> ${req.schoolName}<br><span class="school-shared"><b>المشتركة:</b> ${req.sharedSchoolName || 'لا يوجد'}</span><br><span class="table-meta">(${req.secretaryName})</span></td>
                <td>${req.teacherName}<br><span class="table-meta">هوية: ${req.teacherId}</span></td>
                <td>${req.specialization}<br><span class="table-reason">${req.reason}</span></td>
                <td>${req.startDate}<br>إلى ${req.endDate}</td>
                <td>
                    <select id="status_${dId}">
                        <option value="قيد المراجعة" ${status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                        <option value="تمت الموافقة" ${status === 'تمت الموافقة' ? 'selected' : ''}>تمت الموافقة</option>
                        <option value="مرفوض" ${status === 'مرفوض' ? 'selected' : ''}>مرفوض</option>
                    </select>
                </td>
                <td><input type="text" id="subName_${dId}" value="${req.subName || ''}" placeholder="اسم البديل"></td>
                <td><input type="text" id="subId_${dId}" value="${req.subId || ''}" placeholder="هوية البديل"></td>
                <td><input type="text" id="subPhone_${dId}" value="${req.subPhone || ''}" placeholder="هاتف البديل"></td>
                <td>
                    <button class="table-action table-action--save" data-action="save" data-document-id="${dId}">حفظ</button>
                    <button class="table-action table-action--print" data-action="print" data-document-id="${dId}">🖨️ طباعة</button>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-state">حدث خطأ في تحميل البيانات من جوجل شيت. تأكد من نشر الـ Web App بشكل صحيح.</p>';
    }
}

async function saveAdminRow(dId) {
    let status = document.getElementById(`status_${dId}`).value;
    let subName = document.getElementById(`subName_${dId}`).value.trim();
    let subId = document.getElementById(`subId_${dId}`).value.trim();
    let subPhone = document.getElementById(`subPhone_${dId}`).value.trim();

    try {
        await AppData.updateRequest({
            action: 'update',
            id: dId,
            status, subName, subId, subPhone
        });
        alert('✅ تم تحديث بيانات وحالة الطلب في جوجل شيت بنجاح!');
    } catch (error) {
        console.error(error);
        alert('❌ فشل حفظ التحديثات.');
    }
}

function printSingleRequest(dId) {
    let req = cloudRequests.find(r => r.docId === dId);
    if (!req) return;

    let content = `
        <div>🏫 <b>المدرسة الأساسية:</b> ${req.schoolName}</div>
        <div>🏫 <b>المدرسة المشتركة:</b> ${req.schoolName}</div> 
        <div>👤 <b>اسم السكرتير المسؤول:</b> ${req.secretaryName} (رقم: ${req.secretaryId || 'غير متوفر'})</div>
        <div>👤 <b>المعلم المنقطع (الاصيل):</b> ${req.teacherName} (رقم الهوية: ${req.teacherId})</div>
        <div>📚 <b>الصفوف والمواد:</b> ${req.classes || 'غير محدد'}</div>
        <div>📋 <b>سبب الانقطاع / الإجازة:</b> ${req.reason}</div>
        <div>🎓 <b>التخصص المطلوب للبديل:</b> ${req.specialization}</div>
        <div>📅 <b>فترة الانقطاع:</b> من تاريخ ${req.startDate} إلى تاريخ ${req.endDate}</div>
        <hr class="print-separator">
        <div>📌 <b>حالة الطلب في المديرية:</b> <span class="print-status">${req.status}</span></div>
        <div>👤 <b>بيانات المعلم البديل:</b> ${req.subName ? req.subName + ' (هوية: ' + req.subId + ' - هاتف: ' + req.subPhone + ')' : 'لم يتم اعتماده بعد'}</div>
        <div>🕒 <b>تاريخ تقديم الطلب:</b> ${req.timestamp}</div>
    `;
    document.getElementById('print-content-details').innerHTML = content;
    window.print();
}

function exportToExcel() {
    if (cloudRequests.length === 0) { alert('لا توجد بيانات للتصدير.'); return; }

    let dataToExport = cloudRequests.map((r, index) => ({
        "م": index + 1, "المدرسة الأساسية": r.schoolName, "المدرسة المشتركة": r.sharedSchoolName || 'لا يوجد',
        "اسم السكرتير": r.secretaryName, "رقم السكرتير": r.secretaryId || '',
        "المعلم المنقطع": r.teacherName, "هوية المعلم": r.teacherId, "الصفوف والمواد": r.classes,
        "تاريخ البدء": r.startDate, "تاريخ الانتهاء": r.endDate, "التخصص المطلوب": r.specialization,
        "سبب الانقطاع": r.reason, "حالة الطلب": r.status, "اسم المعلم البديل": r.subName || '',
        "هوية البديل": r.subId || '', "هاتف البديل": r.subPhone || '', "تاريخ الإرسال": r.timestamp
    }));

    let worksheet = XLSX.utils.json_to_sheet(dataToExport);
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "طلبات البدلاء");
    XLSX.writeFile(workbook, "Substitute_Requests.xlsx");
}

function bindEvents() {
    document.getElementById('login-btn').addEventListener('click', loginSecretary);
    document.getElementById('secretary-logout-btn').addEventListener('click', () => location.reload());
    document.getElementById('submit-btn').addEventListener('click', submitRequest);
    document.getElementById('admin-login-btn').addEventListener('click', showAdmin);
    document.getElementById('add-school-btn').addEventListener('click', addNewSchool);
    document.getElementById('add-secretary-btn').addEventListener('click', addNewSecretary);
    document.getElementById('refresh-btn').addEventListener('click', loadAdminData);
    document.getElementById('export-btn').addEventListener('click', exportToExcel);
    document.getElementById('admin-logout-btn').addEventListener('click', () => location.reload());

    document.getElementById('admin-table-container').addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        if (button.dataset.action === 'save') {
            saveAdminRow(button.dataset.documentId);
        } else if (button.dataset.action === 'print') {
            printSingleRequest(button.dataset.documentId);
        }
    });
}

populateSchools();
bindEvents();
