const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        value(key) {
            return values.get(key);
        }
    };
}

function createElement() {
    const element = {
        value: '',
        innerText: '',
        textContent: '',
        disabled: false,
        style: {},
        children: [],
        listeners: {},
        appendChild(child) {
            this.children.push(child);
        },
        addEventListener(type, listener) {
            this.listeners[type] = listener;
        }
    };

    Object.defineProperty(element, 'innerHTML', {
        get() {
            return this.html || '';
        },
        set(value) {
            this.html = value;
            this.children = value.includes('<option') ? [createElement()] : [];
        }
    });

    return element;
}

function createDocument() {
    const ids = [
        'login-screen', 'secretary-input', 'secretary-dashboard', 'welcome-msg',
        'welcome-text', 'school-name', 'shared-school-name', 'teacher-name',
        'teacher-id', 'classes', 'start-date', 'end-date', 'specialization',
        'reason', 'submit-btn', 'admin-login-area', 'admin-panel',
        'new-school-input', 'new-sec-name', 'new-sec-id', 'admin-table-container',
        'printable-area', 'print-content-details', 'login-btn',
        'secretary-logout-btn', 'admin-login-btn', 'add-school-btn',
        'add-secretary-btn', 'refresh-btn', 'export-btn', 'admin-logout-btn'
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, createElement()]));

    return {
        elements,
        getElementById(id) {
            return elements[id] || null;
        },
        createElement
    };
}

function runScript(relativePath, context) {
    const filename = path.join(projectRoot, relativePath);
    const source = fs.readFileSync(filename, 'utf8');
    vm.runInContext(source, context, { filename });
}

function createContext(options = {}) {
    const calls = [];
    const alerts = [];
    const storage = createStorage(options.storage);
    const document = createDocument();
    const context = {
        alert(message) {
            alerts.push(message);
        },
        console,
        document,
        fetch: options.fetch || (async (...args) => {
            calls.push(args);
            return { json: async () => [] };
        }),
        localStorage: storage,
        location: { reload() {} },
        prompt: options.prompt || (() => ''),
        window: options.window || { print() {} },
        XLSX: options.XLSX || {
            utils: {
                json_to_sheet(data) { return data; },
                book_new() { return {}; },
                book_append_sheet() {}
            },
            writeFile() {}
        }
    };
    context.globalThis = context;
    vm.createContext(context);

    return { alerts, calls, context, document, storage };
}

function loadData(context) {
    runScript('js/data.js', context);
    return vm.runInContext('AppData', context);
}

test('default data preserves every official school and secretary', () => {
    const { context } = createContext();
    const data = loadData(context);

    const schools = data.getSchools();
    const secretaries = data.getSecretaries();

    assert.equal(schools.length, 187);
    assert.equal(secretaries.length, 190);
    assert.equal(schools[0], 'الشهيد أبو عمار الأساسية المختلطة');
    assert.deepEqual(
        JSON.parse(JSON.stringify(secretaries[0])),
        { id: '1001', name: 'هنادي يوسف محمد الرجوب' }
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(secretaries.at(-1))),
        { id: '1190', name: 'عصام احمد ابراهيم الشعراوي' }
    );
});

test('stored schools and secretaries keep the existing localStorage contract', () => {
    const storedSchools = ['مدرسة اختبار'];
    const storedSecretaries = [{ id: '9', name: 'سكرتير اختبار' }];
    const { context } = createContext({
        storage: {
            app_schools: JSON.stringify(storedSchools),
            app_secretaries: JSON.stringify(storedSecretaries)
        }
    });
    const data = loadData(context);

    assert.deepEqual(Array.from(data.getSchools()), storedSchools);
    assert.deepEqual(
        JSON.parse(JSON.stringify(data.getSecretaries())),
        storedSecretaries
    );
});

test('saving local data uses the original storage keys and JSON format', () => {
    const { context, storage } = createContext();
    const data = loadData(context);

    data.saveSchools(['أ']);
    data.saveSecretaries([{ id: '1', name: 'ب' }]);

    assert.equal(storage.value('app_schools'), '["أ"]');
    assert.equal(storage.value('app_secretaries'), '[{"id":"1","name":"ب"}]');
});

test('request data operations preserve the existing Google Apps Script contract', async () => {
    const calls = [];
    const responses = [{ docId: 'DOC_1' }];
    const { context } = createContext({
        fetch: async (...args) => {
            calls.push(args);
            return { json: async () => responses };
        }
    });
    const data = loadData(context);
    const newRequest = { action: 'add', id: 'REQ_1' };
    const update = { action: 'update', id: 'DOC_1', status: 'تمت الموافقة' };

    await data.addRequest(newRequest);
    const loaded = await data.getRequests();
    await data.updateRequest(update);

    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
        ['YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE', {
            method: 'POST',
            body: JSON.stringify(newRequest)
        }],
        ['YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'],
        ['YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE', {
            method: 'POST',
            body: JSON.stringify(update)
        }]
    ]);
    assert.deepEqual(loaded, responses);
});

test('initialization populates both school lists and binds every static action', () => {
    const { context, document } = createContext();
    loadData(context);
    runScript('js/main.js', context);

    assert.equal(document.elements['school-name'].children.length, 188);
    assert.equal(document.elements['shared-school-name'].children.length, 188);
    for (const id of [
        'login-btn', 'secretary-logout-btn', 'submit-btn', 'admin-login-btn',
        'add-school-btn', 'add-secretary-btn', 'refresh-btn', 'export-btn',
        'admin-logout-btn', 'admin-table-container'
    ]) {
        assert.equal(typeof document.elements[id].listeners.click, 'function', `${id} click handler`);
    }
});

test('secretary login preserves exact-id, partial-name, and fallback behavior', () => {
    const { alerts, context, document } = createContext();
    loadData(context);
    runScript('js/main.js', context);

    vm.runInContext('loginSecretary()', context);
    assert.equal(alerts.at(-1), '⚠️ الرجاء إدخال رقم السكرتير أو اسمه.');

    document.elements['secretary-input'].value = '1001';
    vm.runInContext('loginSecretary()', context);
    assert.equal(document.elements['login-screen'].style.display, 'none');
    assert.equal(document.elements['secretary-dashboard'].style.display, 'block');
    assert.equal(
        document.elements['welcome-text'].innerText,
        '👋 أهلاً بك: هنادي يوسف محمد الرجوب (رقم: 1001)'
    );

    document.elements['secretary-input'].value = 'مستخدم جديد';
    vm.runInContext('loginSecretary()', context);
    assert.equal(
        document.elements['welcome-text'].innerText,
        '👋 أهلاً بك: مستخدم جديد (رقم: مستخدم جديد)'
    );
});

test('request submission validates required fields and preserves its payload and reset behavior', async () => {
    const fetchCalls = [];
    const { alerts, context, document } = createContext({
        fetch: async (...args) => {
            fetchCalls.push(args);
            return { json: async () => [] };
        }
    });
    loadData(context);
    runScript('js/main.js', context);

    await vm.runInContext('submitRequest()', context);
    assert.equal(alerts.at(-1), '⚠️ الرجاء تعبئة جميع الحقول الأساسية.');
    assert.equal(fetchCalls.length, 0);

    document.elements['secretary-input'].value = '1001';
    vm.runInContext('loginSecretary()', context);
    Object.assign(document.elements['school-name'], { value: 'مدرسة أساسية' });
    Object.assign(document.elements['shared-school-name'], { value: 'مدرسة مشتركة' });
    Object.assign(document.elements['teacher-name'], { value: 'معلم أصيل' });
    Object.assign(document.elements['teacher-id'], { value: '123456789' });
    Object.assign(document.elements.classes, { value: 'رياضيات' });
    Object.assign(document.elements['start-date'], { value: '2026-09-01' });
    Object.assign(document.elements['end-date'], { value: '2026-09-30' });
    Object.assign(document.elements.specialization, { value: 'رياضيات' });
    Object.assign(document.elements.reason, { value: 'إجازة مرضية' });

    await vm.runInContext('submitRequest()', context);

    const body = JSON.parse(fetchCalls[0][1].body);
    assert.equal(body.action, 'add');
    assert.match(body.id, /^REQ_\d+$/);
    assert.equal(body.secretaryName, 'هنادي يوسف محمد الرجوب');
    assert.equal(body.secretaryId, '1001');
    assert.equal(body.schoolName, 'مدرسة أساسية');
    assert.equal(body.sharedSchoolName, 'مدرسة مشتركة');
    assert.equal(body.teacherName, 'معلم أصيل');
    assert.equal(body.status, 'قيد المراجعة');
    assert.equal(body.subName, '');
    assert.equal(alerts.at(-1), '✅ تم إرسال الطلب بنجاح إلى قسم الشؤون الإدارية وتوثيقه في جوجل شيت!');
    assert.equal(document.elements['teacher-name'].value, '');
    assert.equal(document.elements['shared-school-name'].value, '');
    assert.equal(document.elements['submit-btn'].disabled, false);
    assert.equal(document.elements['submit-btn'].innerText, '📨 إرسال الطلب (إلى الشؤون الإدارية)');
});

test('adding schools and secretaries preserves duplicate checks and local persistence', () => {
    const { alerts, context, document, storage } = createContext();
    loadData(context);
    runScript('js/main.js', context);

    document.elements['new-school-input'].value = 'مدرسة جديدة';
    vm.runInContext('addNewSchool()', context);
    assert.equal(alerts.at(-1), '✅ تمت إضافة المدرسة بنجاح!');
    assert.ok(JSON.parse(storage.value('app_schools')).includes('مدرسة جديدة'));

    document.elements['new-school-input'].value = 'مدرسة جديدة';
    vm.runInContext('addNewSchool()', context);
    assert.equal(alerts.at(-1), '⚠️ المدرسة موجودة مسبقاً.');

    document.elements['new-sec-name'].value = 'سكرتير جديد';
    document.elements['new-sec-id'].value = '9000';
    vm.runInContext('addNewSecretary()', context);
    assert.equal(alerts.at(-1), '✅ تمت إضافة السكرتير بنجاح!');
    assert.deepEqual(JSON.parse(storage.value('app_secretaries')).at(-1), {
        id: '9000',
        name: 'سكرتير جديد'
    });
});

test('admin access preserves the existing password behavior', () => {
    const allowed = createContext({ prompt: () => '1978' });
    loadData(allowed.context);
    runScript('js/main.js', allowed.context);
    vm.runInContext('showAdmin()', allowed.context);

    assert.equal(allowed.document.elements['admin-login-area'].style.display, 'none');
    assert.equal(allowed.document.elements['admin-panel'].style.display, 'block');

    const denied = createContext({ prompt: () => 'wrong' });
    loadData(denied.context);
    runScript('js/main.js', denied.context);
    vm.runInContext('showAdmin()', denied.context);

    assert.equal(denied.alerts.at(-1), '❌ رمز المرور غير صحيح.');
});

test('admin requests render, update, print, and export with the existing values', async () => {
    const calls = [];
    const printed = [];
    const exported = {};
    const request = {
        docId: 'DOC_1',
        schoolName: 'مدرسة أساسية',
        sharedSchoolName: 'مدرسة مشتركة',
        secretaryName: 'سكرتير',
        secretaryId: '1001',
        teacherName: 'معلم',
        teacherId: '123',
        classes: 'رياضيات',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        specialization: 'رياضيات',
        reason: 'إجازة مرضية',
        status: 'تمت الموافقة',
        subName: 'معلم بديل',
        subId: '456',
        subPhone: '0590000000',
        timestamp: '١٢‏/٩‏/٢٠٢٦'
    };
    const XLSX = {
        utils: {
            json_to_sheet(data) {
                exported.rows = data;
                return { rows: data };
            },
            book_new() {
                return { sheets: [] };
            },
            book_append_sheet(workbook, worksheet, name) {
                workbook.sheets.push({ worksheet, name });
                exported.sheetName = name;
            }
        },
        writeFile(workbook, filename) {
            exported.workbook = workbook;
            exported.filename = filename;
        }
    };
    const app = createContext({
        XLSX,
        window: { print() { printed.push(true); } },
        fetch: async (...args) => {
            calls.push(args);
            return { json: async () => [request] };
        }
    });
    loadData(app.context);
    runScript('js/main.js', app.context);

    await vm.runInContext('loadAdminData()', app.context);
    const table = app.document.elements['admin-table-container'].innerHTML;
    assert.match(table, /مدرسة مشتركة/);
    assert.match(table, /data-action="save"/);
    assert.match(table, /data-action="print"/);

    for (const [id, value] of [
        ['status_DOC_1', 'تمت الموافقة'],
        ['subName_DOC_1', 'معلم بديل'],
        ['subId_DOC_1', '456'],
        ['subPhone_DOC_1', '0590000000']
    ]) {
        app.document.elements[id] = createElement();
        app.document.elements[id].value = value;
    }
    await vm.runInContext("saveAdminRow('DOC_1')", app.context);
    assert.deepEqual(JSON.parse(calls.at(-1)[1].body), {
        action: 'update',
        id: 'DOC_1',
        status: 'تمت الموافقة',
        subName: 'معلم بديل',
        subId: '456',
        subPhone: '0590000000'
    });

    vm.runInContext("printSingleRequest('DOC_1')", app.context);
    assert.equal(printed.length, 1);
    assert.match(app.document.elements['print-content-details'].innerHTML, /مدرسة أساسية/);
    assert.match(app.document.elements['print-content-details'].innerHTML, /معلم بديل/);

    vm.runInContext('exportToExcel()', app.context);
    assert.equal(exported.rows.length, 1);
    assert.equal(exported.sheetName, 'طلبات البدلاء');
    assert.equal(exported.filename, 'Substitute_Requests.xlsx');
});
