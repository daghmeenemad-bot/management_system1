let schools = AppData.getSchools();
let secretaries = AppData.getSecretaries();
let currentSecretary = null;
let cloudRequests = [];

function populateSchools() {
    const schoolSelect =
        document.getElementById("school-name");

    const sharedSelect =
        document.getElementById("shared-school-name");

    schoolSelect.innerHTML =
        '<option value="">-- اختر المدرسة الأساسية --</option>';

    sharedSelect.innerHTML =
        '<option value="">-- اختر المدرسة المشتركة (اختياري) --</option>';

    schools.sort().forEach((school) => {
        const primaryOption =
            document.createElement("option");

        primaryOption.value = school;
        primaryOption.textContent = school;
        schoolSelect.appendChild(primaryOption);

        const sharedOption =
            document.createElement("option");

        sharedOption.value = school;
        sharedOption.textContent = school;
        sharedSelect.appendChild(sharedOption);
    });
}

function loginSecretary() {
    const inputValue = document
        .getElementById("secretary-input")
        .value
        .trim();

    if (!inputValue) {
        alert(
            "⚠️ الرجاء إدخال رقم السكرتير أو اسمه."
        );
        return;
    }

    let foundSecretary = secretaries.find(
        (secretary) =>
            secretary.id === inputValue ||
            secretary.name.includes(inputValue)
    );

    if (!foundSecretary) {
        foundSecretary = {
            id: inputValue,
            name: inputValue
        };
    }

    currentSecretary = foundSecretary;

    document.getElementById("login-screen").style.display =
        "none";

    document.getElementById(
        "secretary-dashboard"
    ).style.display = "block";

    document.getElementById("welcome-text").innerText =
        `👋 أهلاً بك: ${currentSecretary.name} ` +
        `(رقم: ${currentSecretary.id})`;
}

async function submitRequest() {
    const schoolName = document
        .getElementById("school-name")
        .value
        .trim();

    const sharedSchoolName = document
        .getElementById("shared-school-name")
        .value
        .trim();

    const teacherName = document
        .getElementById("teacher-name")
        .value
        .trim();

    const teacherId = document
        .getElementById("teacher-id")
        .value
        .trim();

    const classes = document
        .getElementById("classes")
        .value
        .trim();

    const startDate =
        document.getElementById("start-date").value;

    const endDate =
        document.getElementById("end-date").value;

    const specialization = document
        .getElementById("specialization")
        .value
        .trim();

    const reason =
        document.getElementById("reason").value;

    if (
        !schoolName ||
        !teacherName ||
        !teacherId ||
        !startDate ||
        !endDate ||
        !specialization
    ) {
        alert(
            "⚠️ الرجاء تعبئة جميع الحقول الأساسية."
        );
        return;
    }

    const submitButton =
        document.getElementById("submit-btn");

    submitButton.disabled = true;
    submitButton.innerText =
        "⏳ جاري إرسال الطلب وحفظه في جوجل شيت...";

    const newRequest = {
        action: "add",
        id: "REQ_" + Date.now(),

        secretaryName: currentSecretary.name,
        secretaryId: currentSecretary.id,

        schoolName,
        sharedSchoolName: sharedSchoolName || "لا يوجد",
        teacherName,
        teacherId,
        classes,
        startDate,
        endDate,
        specialization,
        reason,

        status: "قيد المراجعة",
        subName: "",
        subId: "",
        subPhone: "",

        timestamp: new Date().toLocaleString("ar-PS")
    };

    try {
        await AppData.addRequest(newRequest);

        alert(
            "✅ تم إرسال الطلب بنجاح إلى قسم " +
            "الشؤون الإدارية وتوثيقه في جوجل شيت!"
        );

        document.getElementById("teacher-name").value = "";
        document.getElementById("teacher-id").value = "";
        document.getElementById("classes").value = "";
        document.getElementById("start-date").value = "";
        document.getElementById("end-date").value = "";
        document.getElementById("specialization").value = "";
        document.getElementById("shared-school-name").value = "";
    } catch (error) {
        console.error(error);

        alert(
            "❌ حدث خطأ أثناء إرسال الطلب. " +
            "تأكد من رابط Google Apps Script واتصال الإنترنت."
        );
    } finally {
        submitButton.disabled = false;
        submitButton.innerText =
            "📨 إرسال الطلب (إلى الشؤون الإدارية)";
    }
}

function showAdmin() {
    const password = prompt(
        "🔐 أدخل رمز المرور الخاص بقسم الشؤون الإدارية:"
    );

    if (password === "1978") {
        document.getElementById(
            "admin-login-area"
        ).style.display = "none";

        document.getElementById(
            "admin-panel"
        ).style.display = "block";

        loadAdminData();
    } else {
        alert("❌ رمز المرور غير صحيح.");
    }
}

function addNewSchool() {
    const name = document
        .getElementById("new-school-input")
        .value
        .trim();

    if (!name) {
        alert("⚠️ اكتب اسم المدرسة الجديدة.");
        return;
    }

    if (schools.includes(name)) {
        alert("⚠️ المدرسة موجودة مسبقاً.");
        return;
    }

    schools.push(name);
    AppData.saveSchools(schools);
    populateSchools();

    alert("✅ تمت إضافة المدرسة بنجاح!");

    document.getElementById(
        "new-school-input"
    ).value = "";
}

function addNewSecretary() {
    const name = document
        .getElementById("new-sec-name")
        .value
        .trim();

    const id = document
        .getElementById("new-sec-id")
        .value
        .trim();

    if (!name || !id) {
        alert(
            "⚠️ تأكد من إدخال اسم السكرتير " +
            "ورقم السكرتير/الهوية."
        );
        return;
    }

    if (
        secretaries.some(
            (secretary) => secretary.id === id
        )
    ) {
        alert("⚠️ رقم السكرتير موجود مسبقاً.");
        return;
    }

    secretaries.push({ id, name });
    AppData.saveSecretaries(secretaries);

    alert("✅ تمت إضافة السكرتير بنجاح!");

    document.getElementById("new-sec-name").value = "";
    document.getElementById("new-sec-id").value = "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadAdminData() {
    const container = document.getElementById(
        "admin-table-container"
    );

    container.innerHTML =
        '<div class="loading">' +
        "جاري جلب الطلبات من جوجل شيت..." +
        "</div>";

    try {
        cloudRequests = await AppData.getRequests();

        if (!cloudRequests.length) {
            container.innerHTML =
                '<p class="empty-state">' +
                "لا توجد طلبات مسجلة حتى الآن." +
                "</p>";

            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>م</th>
                        <th>المدارس والسكرتير</th>
                        <th>المعلم المنقطع</th>
                        <th>التخصص والسبب</th>
                        <th>الفترة</th>
                        <th>الحالة</th>
                        <th>اسم البديل</th>
                        <th>هوية البديل</th>
                        <th>هاتف البديل</th>
                        <th>إجراء</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cloudRequests.forEach((request, index) => {
            const documentId =
                escapeHtml(request.docId);

            const status =
                request.status || "قيد المراجعة";

            html += `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <b>الأساسية:</b>
                        ${escapeHtml(request.schoolName)}
                        <br>

                        <span class="school-shared">
                            <b>المشتركة:</b>
                            ${escapeHtml(
                                request.sharedSchoolName ||
                                "لا يوجد"
                            )}
                        </span>
                        <br>

                        <span class="table-meta">
                            (${escapeHtml(
                                request.secretaryName
                            )})
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(request.teacherName)}
                        <br>

                        <span class="table-meta">
                            هوية:
                            ${escapeHtml(request.teacherId)}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(request.specialization)}
                        <br>

                        <span class="table-reason">
                            ${escapeHtml(request.reason)}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(request.startDate)}
                        <br>
                        إلى ${escapeHtml(request.endDate)}
                    </td>

                    <td>
                        <select id="status_${documentId}">
                            <option
                                value="قيد المراجعة"
                                ${
                                    status === "قيد المراجعة"
                                        ? "selected"
                                        : ""
                                }
                            >
                                قيد المراجعة
                            </option>

                            <option
                                value="تمت الموافقة"
                                ${
                                    status === "تمت الموافقة"
                                        ? "selected"
                                        : ""
                                }
                            >
                                تمت الموافقة
                            </option>

                            <option
                                value="مرفوض"
                                ${
                                    status === "مرفوض"
                                        ? "selected"
                                        : ""
                                }
                            >
                                مرفوض
                            </option>
                        </select>
                    </td>

                    <td>
                        <input
                            type="text"
                            id="subName_${documentId}"
                            value="${escapeHtml(
                                request.subName
                            )}"
                            placeholder="اسم البديل"
                        >
                    </td>

                    <td>
                        <input
                            type="text"
                            id="subId_${documentId}"
                            value="${escapeHtml(
                                request.subId
                            )}"
                            placeholder="هوية البديل"
                        >
                    </td>

                    <td>
                        <input
                            type="text"
                            id="subPhone_${documentId}"
                            value="${escapeHtml(
                                request.subPhone
                            )}"
                            placeholder="هاتف البديل"
                        >
                    </td>

                    <td>
                        <button
                            class="table-action table-action--save"
                            data-action="save"
                            data-document-id="${documentId}"
                        >
                            حفظ
                        </button>

                        <button
                            class="table-action table-action--print"
                            data-action="print"
                            data-document-id="${documentId}"
                        >
                            🖨️ طباعة
                        </button>
                    </td>
                </tr>
            `;
        });

        html += "</tbody></table>";
        container.innerHTML = html;
    } catch (error) {
        console.error(error);

        container.innerHTML =
            '<p class="error-state">' +
            "حدث خطأ في تحميل البيانات من جوجل شيت. " +
            "تأكد من نشر Web App بشكل صحيح." +
            "</p>";
    }
}

async function saveAdminRow(documentId) {
    const status = document.getElementById(
        `status_${documentId}`
    ).value;

    const subName = document.getElementById(
        `subName_${documentId}`
    ).value.trim();

    const subId = document.getElementById(
        `subId_${documentId}`
    ).value.trim();

    const subPhone = document.getElementById(
        `subPhone_${documentId}`
    ).value.trim();

    try {
        await AppData.updateRequest({
            action: "update",
            id: documentId,
            status,
            subName,
            subId,
            subPhone
        });

        alert(
            "✅ تم تحديث بيانات وحالة الطلب " +
            "في جوجل شيت بنجاح!"
        );

        await loadAdminData();
    } catch (error) {
        console.error(error);
        alert("❌ فشل حفظ التحديثات.");
    }
}

function printSingleRequest(documentId) {
    const request = cloudRequests.find(
        (item) => item.docId === documentId
    );

    if (!request) {
        return;
    }

    const content = `
        <div>
            🏫 <b>المدرسة الأساسية:</b>
            ${escapeHtml(request.schoolName)}
        </div>

        <div>
            🏫 <b>المدرسة المشتركة:</b>
            ${escapeHtml(
                request.sharedSchoolName || "لا يوجد"
            )}
        </div>

        <div>
            👤 <b>اسم السكرتير المسؤول:</b>
            ${escapeHtml(request.secretaryName)}
            (رقم:
            ${escapeHtml(
                request.secretaryId || "غير متوفر"
            )})
        </div>

        <div>
            👤 <b>المعلم المنقطع (الأصيل):</b>
            ${escapeHtml(request.teacherName)}
            (رقم الهوية:
            ${escapeHtml(request.teacherId)})
        </div>

        <div>
            📚 <b>الصفوف والمواد:</b>
            ${escapeHtml(
                request.classes || "غير محدد"
            )}
        </div>

        <div>
            📋 <b>سبب الانقطاع / الإجازة:</b>
            ${escapeHtml(request.reason)}
        </div>

        <div>
            🎓 <b>التخصص المطلوب للبديل:</b>
            ${escapeHtml(request.specialization)}
        </div>

        <div>
            📅 <b>فترة الانقطاع:</b>
            من تاريخ ${escapeHtml(request.startDate)}
            إلى تاريخ ${escapeHtml(request.endDate)}
        </div>

        <hr class="print-separator">

        <div>
            📌 <b>حالة الطلب في المديرية:</b>
            <span class="print-status">
                ${escapeHtml(request.status)}
            </span>
        </div>

        <div>
            👤 <b>بيانات المعلم البديل:</b>
            ${
                request.subName
                    ? `${escapeHtml(request.subName)}
                       (هوية:
                       ${escapeHtml(request.subId)}
                       - هاتف:
                       ${escapeHtml(request.subPhone)})`
                    : "لم يتم اعتماده بعد"
            }
        </div>

        <div>
            🕒 <b>تاريخ تقديم الطلب:</b>
            ${escapeHtml(request.timestamp)}
        </div>
    `;

    document.getElementById(
        "print-content-details"
    ).innerHTML = content;

    window.print();
}

function exportToExcel() {
    if (!cloudRequests.length) {
        alert("لا توجد بيانات للتصدير.");
        return;
    }

    const dataToExport = cloudRequests.map(
        (request, index) => ({
            "م": index + 1,
            "المدرسة الأساسية": request.schoolName,
            "المدرسة المشتركة":
                request.sharedSchoolName || "لا يوجد",
            "اسم السكرتير": request.secretaryName,
            "رقم السكرتير": request.secretaryId || "",
            "المعلم المنقطع": request.teacherName,
            "هوية المعلم": request.teacherId,
            "الصفوف والمواد": request.classes,
            "تاريخ البدء": request.startDate,
            "تاريخ الانتهاء": request.endDate,
            "التخصص المطلوب": request.specialization,
            "سبب الانقطاع": request.reason,
            "حالة الطلب": request.status,
            "اسم المعلم البديل": request.subName || "",
            "هوية البديل": request.subId || "",
            "هاتف البديل": request.subPhone || "",
            "تاريخ الإرسال": request.timestamp
        })
    );

    const worksheet =
        XLSX.utils.json_to_sheet(dataToExport);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "طلبات البدلاء"
    );

    XLSX.writeFile(
        workbook,
        "Substitute_Requests.xlsx"
    );
}

function bindEvents() {
    document
        .getElementById("login-btn")
        .addEventListener("click", loginSecretary);

    document
        .getElementById("secretary-logout-btn")
        .addEventListener(
            "click",
            () => location.reload()
        );

    document
        .getElementById("submit-btn")
        .addEventListener("click", submitRequest);

    document
        .getElementById("admin-login-btn")
        .addEventListener("click", showAdmin);

    document
        .getElementById("add-school-btn")
        .addEventListener("click", addNewSchool);

    document
        .getElementById("add-secretary-btn")
        .addEventListener("click", addNewSecretary);

    document
        .getElementById("refresh-btn")
        .addEventListener("click", loadAdminData);

    document
        .getElementById("export-btn")
        .addEventListener("click", exportToExcel);

    document
        .getElementById("admin-logout-btn")
        .addEventListener(
            "click",
            () => location.reload()
        );

    document
        .getElementById("admin-table-container")
        .addEventListener("click", (event) => {
            const button = event.target.closest(
                "button[data-action]"
            );

            if (!button) {
                return;
            }

            const documentId =
                button.dataset.documentId;

            if (button.dataset.action === "save") {
                saveAdminRow(documentId);
            }

            if (button.dataset.action === "print") {
                printSingleRequest(documentId);
            }
        });
}

populateSchools();
bindEvents();