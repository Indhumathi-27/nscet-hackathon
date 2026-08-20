import {
    collection,
    getDocs,
    onSnapshot,
    updateDoc,
    doc,
    setDoc,
    addDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";

console.log("app.js loaded successfully");

const teamsDiv = document.getElementById("teams");

const overallReportButton =
    document.getElementById("overallReportBtn");

const studentsCollection =
    collection(db, "students");

let allStudents = [];
let searchQuery = "";
let currentFilter = "all";

// ========================================
// HELPER FUNCTIONS
// ========================================

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getStudentTeam(student) {
    if (!student) return "General Registration";
    const team = (
        student.teamName ||
        student.teamNo ||
        student.Form ||
        student.team_name ||
        student.team ||
        student.T ||
        ""
    ).trim();

    if (team) return team;
    if (student.school && String(student.school).trim() && String(student.school).trim() !== "N/A") {
        return `School: ${String(student.school).trim()}`;
    }
    return "General Registration";
}

function isVerified(student) {
    if (!student) return false;
    return (
        student.verified === true ||
        student.verified === "true" ||
        student.verified === 1 ||
        student.arrived === true ||
        student.arrived === "true" ||
        student.arrived === 1
    );
}

function getTeamNames() {
    return [
        ...new Set(
            allStudents
                .map(student => getStudentTeam(student))
                .filter(Boolean)
        )
    ];
}

// ========================================
// LOAD STUDENTS (REALTIME SYNC)
// ========================================

function loadStudents() {
    try {
        console.log("Listening for real-time student updates from Firebase...");

        onSnapshot(studentsCollection, (snapshot) => {
            allStudents = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));

            console.log("Real-time students loaded:", allStudents.length);
            showDashboard();
            showTeams();
        }, (error) => {
            console.error("FIREBASE REALTIME LOAD ERROR:", error);
            if (teamsDiv) {
                teamsDiv.innerHTML = `
                    <div class="firebase-error">
                        <strong>❌ Failed to load students from Firebase.</strong>
                        <br><br>
                        ${escapeHTML(error.message)}
                        <br><br>
                        Check your internet connection, Firebase configuration, and Firestore rules.
                    </div>
                `;
            }
        });

    } catch (error) {
        console.error("FIREBASE LOAD ERROR:", error);
    }
}

// ========================================
// DASHBOARD
// ========================================

function showDashboard() {
    const teamNames = getTeamNames();

    const totalTeams = teamNames.length;

    const totalStudents =
        allStudents.length;

    const totalSchools = new Set(
        allStudents
            .map(student => student.school ? String(student.school).trim() : null)
            .filter(Boolean)
    ).size;

    let arrivedTeams = 0;

    teamNames.forEach(teamName => {
        const members = allStudents.filter(
            student => getStudentTeam(student) === teamName
        );

        const teamCompleted =
            members.length > 0 &&
            members.every(student =>
                isVerified(student)
            );

        if (teamCompleted) {
            arrivedTeams++;
        }
    });

    const pendingTeams =
        totalTeams - arrivedTeams;

    const values = {
        totalTeams,
        arrivedTeams,
        pendingTeams,
        totalStudents,
        totalSchools
    };

    Object.entries(values).forEach(
        ([id, value]) => {
            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = value;
            }
        }
    );

    setupSchoolsModal(allStudents);
    setupStudentsModal(allStudents);
}

function setupStudentsModal(students) {
    const studentsCard = document.getElementById("studentsStatCard");
    const studentsModal = document.getElementById("studentsModal");
    const closeBtn = document.getElementById("closeStudentsModalBtn");
    const tableBody = document.getElementById("studentsTableBody");
    const searchInput = document.getElementById("studentSearchInput");

    if (!studentsCard || !studentsModal || !tableBody) return;

    function renderStudentsTable(filterQuery = "") {
        const query = filterQuery.toLowerCase();

        const filtered = students.filter(s => {
            const name = String(s.studentName || "").toLowerCase();
            const school = String(s.school || "").toLowerCase();
            const team = String(s.teamTitle || s.customTeamName || s.team_name || s.teamName || "").toLowerCase();
            return name.includes(query) || school.includes(query) || team.includes(query);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted); font-weight: 600;">
                        No student records found matching "${escapeHTML(filterQuery)}".
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map((s, idx) => {
            const studentName = s.studentName || "Unnamed Participant";
            const schoolName = s.school && s.school !== "N/A" ? s.school : "N/A";
            const teamTitle = s.teamTitle || s.customTeamName || s.team_name || s.teamName || "N/A";
            const arrived = isVerified(s);

            return `
                <tr>
                    <td style="font-weight: 800; color: #2563eb;">${idx + 1}</td>
                    <td style="font-weight: 800; color: var(--text-primary);">
                        ${escapeHTML(studentName)}
                        ${s.participantNo ? `<div style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">ID: ${escapeHTML(s.participantNo)}</div>` : ''}
                    </td>
                    <td style="font-weight: 600; color: var(--text-secondary); max-width: 240px; line-height: 1.4;">${escapeHTML(schoolName)}</td>
                    <td>
                        <span class="team-badge">
                            <span class="team-dot"></span>
                            ${escapeHTML(String(teamTitle).toUpperCase())}
                        </span>
                    </td>
                    <td>
                        <span class="status ${arrived ? 'completed' : 'pending'}">
                            ${arrived ? 'Arrived' : 'Not Arrived'}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    studentsCard.onclick = () => {
        renderStudentsTable();
        studentsModal.classList.add("active");
    };

    if (closeBtn) {
        closeBtn.onclick = () => {
            studentsModal.classList.remove("active");
        };
    }

    studentsModal.onclick = (e) => {
        if (e.target === studentsModal) {
            studentsModal.classList.remove("active");
        }
    };

    if (searchInput) {
        searchInput.oninput = (e) => {
            renderStudentsTable(e.target.value.trim());
        };
    }
}

function setupSchoolsModal(students) {
    const schoolsCard = document.getElementById("schoolsStatCard");
    const schoolsModal = document.getElementById("schoolsModal");
    const closeBtn = document.getElementById("closeSchoolsModalBtn");
    const tableBody = document.getElementById("schoolsTableBody");
    const searchInput = document.getElementById("schoolSearchInput");

    if (!schoolsCard || !schoolsModal || !tableBody) return;

    const schoolMap = {};
    students.forEach(student => {
        const schoolName = String(student.school || "").trim();
        if (!schoolName || schoolName === "N/A") return;

        if (!schoolMap[schoolName]) {
            schoolMap[schoolName] = {
                schoolName,
                teams: new Set(),
                totalStudents: 0,
                arrivedStudents: 0
            };
        }

        const teamName = getStudentTeam(student);
        schoolMap[schoolName].teams.add(teamName);
        schoolMap[schoolName].totalStudents += 1;

        if (isVerified(student)) {
            schoolMap[schoolName].arrivedStudents += 1;
        }
    });

    const schoolsList = Object.values(schoolMap).sort((a, b) => b.totalStudents - a.totalStudents);

    function renderSchoolsTable(filterQuery = "") {
        const filtered = schoolsList.filter(item => 
            item.schoolName.toLowerCase().includes(filterQuery.toLowerCase())
        );

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted); font-weight: 600;">
                        No schools found matching search criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map((item, idx) => `
            <tr>
                <td style="font-weight: 800; color: #2563eb;">${idx + 1}</td>
                <td style="font-weight: 700; color: var(--text-primary); max-width: 280px; line-height: 1.4;">${escapeHTML(item.schoolName)}</td>
                <td><span class="member-count">${item.teams.size} ${item.teams.size === 1 ? 'Team' : 'Teams'}</span></td>
                <td><span style="font-weight: 800; color: var(--text-primary); font-size: 14.5px;">${item.totalStudents} Students</span></td>
                <td>
                    <span class="status ${item.arrivedStudents === item.totalStudents && item.totalStudents > 0 ? 'completed' : item.arrivedStudents > 0 ? 'partial' : 'pending'}">
                        ${item.arrivedStudents} / ${item.totalStudents} Arrived
                    </span>
                </td>
            </tr>
        `).join("");
    }

    schoolsCard.onclick = () => {
        renderSchoolsTable();
        schoolsModal.classList.add("active");
    };

    if (closeBtn) {
        closeBtn.onclick = () => {
            schoolsModal.classList.remove("active");
        };
    }

    schoolsModal.onclick = (e) => {
        if (e.target === schoolsModal) {
            schoolsModal.classList.remove("active");
        }
    };

    if (searchInput) {
        searchInput.oninput = (e) => {
            renderSchoolsTable(e.target.value.trim());
        };
    }
}

// ========================================
// ADD TEAM ITEM FORM
// ========================================

function createMemberInput(number) {
    return `
        <div class="member-input-card" data-member-index="${number}">
            <div class="member-card-header">
                <span class="member-card-title">Member Item #${number}</span>
                ${number > 1 ? `<button type="button" class="remove-member-btn">Remove Item</button>` : ''}
            </div>

            <div class="member-card-grid">
                <div class="form-group">
                    <label>Student Name *</label>
                    <input type="text" class="member-name-input" placeholder="Full student name">
                </div>

                <div class="form-group">
                    <label>Participant No</label>
                    <input type="text" class="participant-input" placeholder="e.g. P101 (Optional)">
                </div>

                <div class="form-group">
                    <label>Class / Division</label>
                    <input type="text" class="class-input" placeholder="e.g. Class 10 - A (Optional)">
                </div>

                <div class="form-group">
                    <label>Student Phone</label>
                    <input type="tel" class="phone-input" placeholder="e.g. 9876543210 (Optional)">
                </div>
            </div>
        </div>
    `;
}

function showAddTeamForm() {
    if (!teamsDiv) return;

    // Generate next default team ID like NSCET-008
    const teamCount = getTeamNames().length;
    const defaultTeamId = `NSCET-${String(teamCount + 1).padStart(3, "0")}`;

    teamsDiv.innerHTML = `
        <div class="add-team-card">
            <button
                id="backToTeamsBtn"
                class="back-btn"
                type="button"
            >
                ← Back to Teams
            </button>

            <div class="form-header">
                <h2>Add New Team Item</h2>
                <p class="form-subtitle">Register a team using fields matching your official Excel spreadsheet format</p>
            </div>

            <div class="form-section">
                <h3>Excel Header Information</h3>

                <div class="team-details-grid">
                    <div class="form-group">
                        <label for="newTeamId">ID / Team ID (Matches Excel 'ID') *</label>
                        <input type="text" id="newTeamId" placeholder="e.g. NSCET-008" value="${escapeHTML(defaultTeamId)}">
                    </div>

                    <div class="form-group">
                        <label for="newTeamName">TEAM NAME *</label>
                        <input type="text" id="newTeamName" placeholder="e.g. Code Craft / Tech Titans">
                    </div>

                    <div class="form-group">
                        <label for="newSchool">SCHOOL NAME *</label>
                        <input type="text" id="newSchool" placeholder="e.g. Nadar Saraswathi Girls Hr. Sec School, Edamal Street, Theni">
                    </div>

                    <div class="form-group">
                        <label for="newProject">PROJECT NAME</label>
                        <input type="text" id="newProject" placeholder="e.g. Smart Village / Echo Drive vehicle">
                    </div>

                    <div class="form-group">
                        <label for="newMentor">MENTOR</label>
                        <input type="text" id="newMentor" placeholder="e.g. S. Dhanalakshmi / 9698713423">
                    </div>

                    <div class="form-group">
                        <label for="newCategory">CATEGORY</label>
                        <select id="newCategory" style="width: 100%; padding: 11px 16px; border: 1.5px solid var(--border-color); border-radius: 12px; font-size: 14.5px; font-weight: 600; color: var(--text-primary); outline: none;">
                            <option value="">Select Category</option>
                            <option value="Software">Software</option>
                            <option value="Hardware">Hardware</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="members-form-header">
                    <h3>Team Member Items (NO OF MEMBERS: 4)</h3>

                    <button
                        id="addMemberBtn"
                        class="add-member-btn"
                        type="button"
                    >
                        Add Member Item
                    </button>
                </div>

                <div id="newMembers">
                    ${createMemberInput(1)}
                    ${createMemberInput(2)}
                    ${createMemberInput(3)}
                    ${createMemberInput(4)}
                </div>
            </div>

            <div class="form-actions">
                <button
                    id="saveTeamBtn"
                    class="save-team-btn"
                    type="button"
                >
                    Save Team Item
                </button>

                <button
                    id="cancelTeamBtn"
                    class="cancel-team-btn"
                    type="button"
                >
                    Cancel
                </button>
            </div>

            <div id="addTeamMessage"></div>
        </div>
    `;

    document
        .getElementById("backToTeamsBtn")
        ?.addEventListener(
            "click",
            showTeams
        );

    document
        .getElementById("cancelTeamBtn")
        ?.addEventListener(
            "click",
            showTeams
        );

    document
        .getElementById("addMemberBtn")
        ?.addEventListener(
            "click",
            addMemberInput
        );

    document
        .getElementById("saveTeamBtn")
        ?.addEventListener(
            "click",
            saveNewTeam
        );

    bindRemoveMemberButtons();
}

function bindRemoveMemberButtons() {
    const membersDiv = document.getElementById("newMembers");
    if (!membersDiv) return;

    membersDiv.querySelectorAll(".remove-member-btn").forEach(btn => {
        btn.onclick = (e) => {
            const card = e.target.closest(".member-input-card");
            if (card) {
                card.remove();
                renumberMemberCards();
            }
        };
    });
}

function renumberMemberCards() {
    const membersDiv = document.getElementById("newMembers");
    if (!membersDiv) return;

    const cards = membersDiv.querySelectorAll(".member-input-card");
    cards.forEach((card, index) => {
        const title = card.querySelector(".member-card-title");
        if (title) {
            title.textContent = `Member Item #${index + 1}`;
        }
    });
}

function addMemberInput() {
    const membersDiv = document.getElementById("newMembers");
    if (!membersDiv) return;

    const number = membersDiv.querySelectorAll(".member-input-card").length + 1;

    membersDiv.insertAdjacentHTML(
        "beforeend",
        createMemberInput(number)
    );

    bindRemoveMemberButtons();
}

// ========================================
// SAVE TEAM
// ========================================

async function saveNewTeam() {
    const teamIdInput = document.getElementById("newTeamId") || document.getElementById("newTeamName");
    const teamNameInput = document.getElementById("newTeamName");
    const schoolInput = document.getElementById("newSchool");
    const projectInput = document.getElementById("newProject");
    const mentorInput = document.getElementById("newMentor");
    const messageDiv = document.getElementById("addTeamMessage");
    const saveButton = document.getElementById("saveTeamBtn");

    if (!teamIdInput || !schoolInput) return;

    const rawTeamId = teamIdInput.value.trim();
    const rawTeamName = teamNameInput ? teamNameInput.value.trim() : rawTeamId;
    const teamId = rawTeamId || rawTeamName;
    const teamName = rawTeamName || rawTeamId;
    const school = schoolInput.value.trim();
    const project = projectInput?.value.trim() || "";
    const mentor = mentorInput?.value.trim() || "";
    const categoryInput = document.getElementById("newCategory");
    const category = categoryInput?.value || "";

    if (!teamId) {
        alert("Please enter Team ID.");
        teamIdInput.focus();
        return;
    }

    if (!teamName) {
        alert("Please enter Team Name.");
        if (teamNameInput) teamNameInput.focus();
        return;
    }

    if (!school) {
        alert("Please enter school name.");
        schoolInput.focus();
        return;
    }

    const memberCards = document.querySelectorAll(".member-input-card");
    const validMembers = [];

    memberCards.forEach(card => {
        const studentName = card.querySelector(".member-name-input")?.value.trim() || "";
        const participantNo = card.querySelector(".participant-input")?.value.trim() || "";
        const classDivision = card.querySelector(".class-input")?.value.trim() || "";
        const studentPhone = card.querySelector(".phone-input")?.value.trim() || "";

        if (studentName) {
            validMembers.push({
                studentName,
                participantNo,
                classDivision,
                studentPhone
            });
        }
    });

    if (validMembers.length === 0) {
        alert("Please enter at least one team member name.");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Saving Team Item...";

        for (let i = 0; i < validMembers.length; i++) {
            const member = validMembers[i];
            const studentId = `${teamId}_${member.participantNo || i + 1}`.replace(/\s+/g, "_");

            const newStudent = {
                studentId,
                teamName: teamId,
                teamId: teamId,
                teamNo: teamId,
                teamTitle: teamName,
                customTeamName: teamName,
                school,
                projectTitle: project,
                mentor,
                studentName: member.studentName,
                participantNo: member.participantNo,
                classDivision: member.classDivision,
                studentPhone: member.studentPhone,
                category,
                verified: false,
                arrived: false,
                createdAt: new Date().toISOString()
            };

            const documentReference = await addDoc(studentsCollection, newStudent);
            allStudents.push({
                id: documentReference.id,
                ...newStudent
            });
        }

        messageDiv.innerHTML = `
            <div class="success-message">
                Team Item "${escapeHTML(teamName)}" with ${validMembers.length} member(s) saved successfully!
            </div>
        `;

        showDashboard();
        setTimeout(showTeams, 800);

    } catch (error) {
        console.error("SAVE TEAM ERROR:", error);
        messageDiv.innerHTML = `
            <div class="firebase-error">
                Failed to save team: ${escapeHTML(error.message)}
            </div>
        `;
        saveButton.disabled = false;
        saveButton.textContent = "Save Team Item";
    }
}


// ========================================
// DELETE TEAM
// ========================================

async function deleteTeam(teamName) {

    const teamMembers = allStudents.filter(
        student =>
            (student.teamName ? String(student.teamName).trim() : "") === teamName
    );

    if (teamMembers.length === 0) {
        alert("Team not found.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${teamName}"?\n\n` +
        `This will permanently delete all ${teamMembers.length} ` +
        `team member(s) from Firebase.\n\n` +
        `This action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {

        console.log(
            "Deleting team:",
            teamName
        );

        // Delete every student document
        for (const student of teamMembers) {

            await deleteDoc(
                doc(
                    db,
                    "students",
                    student.id
                )
            );
        }

        // Remove team members from local array
        allStudents =
            allStudents.filter(
                student =>
                    (student.teamName ? String(student.teamName).trim() : "") !== teamName
            );

        console.log(
            `Team "${teamName}" deleted successfully.`
        );

        // Update dashboard
        showDashboard();

        // Show updated teams
        showTeams();

        alert(
            `Team "${teamName}" deleted successfully.`
        );

    } catch (error) {

        console.error(
            "DELETE TEAM ERROR:",
            error
        );

        alert(
            "Failed to delete team.\n\n" +
            error.message
        );
    }
}

// ========================================
// SEED SAMPLE DEMO DATA
// ========================================

async function seedSampleData() {
    const seedBtn = document.getElementById("seedSampleDataBtn");
    if (seedBtn) {
        seedBtn.disabled = true;
        seedBtn.textContent = "⏳ Adding Demo Teams...";
    }

    const sampleStudents = [
        {
            studentId: "CodeCraft_P1",
            teamName: "Code Craft",
            teamNo: "Code Craft",
            studentName: "Alex Johnson",
            participantNo: "P101",
            school: "NSCET Public School",
            projectTitle: "AI Traffic Light System",
            mentor: "Prof. R. Sharma",
            classDivision: "10-A",
            studentPhone: "9876543210",
            verified: true,
            arrived: true,
            createdAt: new Date().toISOString()
        },
        {
            studentId: "CodeCraft_P2",
            teamName: "Code Craft",
            teamNo: "Code Craft",
            studentName: "Sarah Williams",
            participantNo: "P102",
            school: "NSCET Public School",
            projectTitle: "AI Traffic Light System",
            mentor: "Prof. R. Sharma",
            classDivision: "10-A",
            studentPhone: "9876543211",
            verified: true,
            arrived: true,
            createdAt: new Date().toISOString()
        },
        {
            studentId: "RoboInnovators_P1",
            teamName: "Robo Innovators",
            teamNo: "Robo Innovators",
            studentName: "Michael Brown",
            participantNo: "P201",
            school: "St. Joseph Academy",
            projectTitle: "Smart Irrigation Bot",
            mentor: "Dr. S. Kumar",
            classDivision: "9-B",
            studentPhone: "9876543212",
            verified: false,
            arrived: false,
            createdAt: new Date().toISOString()
        },
        {
            studentId: "RoboInnovators_P2",
            teamName: "Robo Innovators",
            teamNo: "Robo Innovators",
            studentName: "Emily Davis",
            participantNo: "P202",
            school: "St. Joseph Academy",
            projectTitle: "Smart Irrigation Bot",
            mentor: "Dr. S. Kumar",
            classDivision: "9-B",
            studentPhone: "9876543213",
            verified: false,
            arrived: false,
            createdAt: new Date().toISOString()
        }
    ];

    try {
        for (const student of sampleStudents) {
            await setDoc(doc(db, "students", student.studentId), student);
        }
        console.log("Sample demo teams added successfully!");
    } catch (err) {
        console.error("Seed error:", err);
        alert("Failed to add sample teams: " + err.message + "\n\nPlease check Firebase Firestore Security Rules.");
        if (seedBtn) {
            seedBtn.disabled = false;
            seedBtn.textContent = "🌱 Add Sample Demo Teams";
        }
    }
}

// ========================================
// SHOW TEAMS
// ========================================

function showTeams() {
    if (!teamsDiv) return;

    const allTeamNames = getTeamNames();

    let filteredTeamNames = allTeamNames.filter(teamName => {
        const members = allStudents.filter(
            student => getStudentTeam(student) === teamName
        );
        const school = members[0]?.school || "";
        const project = members[0]?.projectTitle || "";
        const studentNames = members.map(m => m.studentName || "").join(" ");
        const participantNos = members.map(m => m.participantNo || "").join(" ");

        const matchesSearch = searchQuery === "" || 
            teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            school.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.toLowerCase().includes(searchQuery.toLowerCase()) ||
            studentNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
            participantNos.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const totalMembers = members.length;
        const arrivedMembers = members.filter(isVerified).length;

        if (currentFilter === "completed") {
            return totalMembers > 0 && arrivedMembers === totalMembers;
        } else if (currentFilter === "partial") {
            return arrivedMembers > 0 && arrivedMembers < totalMembers;
        } else if (currentFilter === "pending") {
            return arrivedMembers === 0;
        }
        return true;
    });

    teamsDiv.innerHTML = `
        <div class="team-header">
            <h2>Registered Teams (${filteredTeamNames.length} of ${allTeamNames.length})</h2>

            <button
                id="addTeamBtn"
                class="add-team-btn"
                type="button"
            >
                Add Team
            </button>
        </div>

        <div class="search-filter-bar">
            <div class="search-input-wrapper">
                <input
                    type="text"
                    id="teamSearchInput"
                    placeholder="Search team name, student, school, project..."
                    value="${escapeHTML(searchQuery)}"
                    style="padding-left: 16px;"
                >
                ${searchQuery ? `<button id="clearSearchBtn" class="search-clear-btn" type="button" title="Clear search">✕</button>` : ''}
            </div>

            <div class="filter-pills">
                <button class="filter-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" type="button">All (${allTeamNames.length})</button>
                <button class="filter-pill ${currentFilter === 'completed' ? 'active' : ''}" data-filter="completed" type="button">Completed</button>
                <button class="filter-pill ${currentFilter === 'partial' ? 'active' : ''}" data-filter="partial" type="button">Partial</button>
                <button class="filter-pill ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending" type="button">Pending</button>
            </div>
        </div>
    `;

    document
        .getElementById("addTeamBtn")
        ?.addEventListener(
            "click",
            showAddTeamForm
        );

    const searchInput = document.getElementById("teamSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            const cursorPos = e.target.selectionStart;
            showTeams();
            const newInput = document.getElementById("teamSearchInput");
            if (newInput) {
                newInput.focus();
                newInput.setSelectionRange(cursorPos, cursorPos);
            }
        });
    }

    document.getElementById("clearSearchBtn")?.addEventListener("click", () => {
        searchQuery = "";
        showTeams();
    });

    document.querySelectorAll(".filter-pill").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            showTeams();
        });
    });

    if (filteredTeamNames.length === 0) {
        if (allTeamNames.length === 0) {
            teamsDiv.insertAdjacentHTML(
                "beforeend",
                `
                    <div class="empty-state-card" style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 20px; border: 2px dashed #cbd5e1; margin-top: 20px;">
                        <h3 style="font-size: 19px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">No Registered Teams Found in Firebase</h3>
                        <p style="color: #64748b; font-size: 14px; max-width: 520px; margin: 0 auto 22px; line-height: 1.5;">
                            Your Firebase database is currently empty. Upload an Excel spreadsheet or click below to populate sample demo teams instantly!
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <a href="import.html" class="save-team-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px;">Import Excel Sheet</a>
                            <button id="seedSampleDataBtn" class="add-team-btn" type="button" style="background: #10b981; padding: 11px 20px;">Add Sample Demo Teams</button>
                        </div>
                    </div>
                `
            );

            document.getElementById("seedSampleDataBtn")?.addEventListener("click", seedSampleData);
        } else {
            teamsDiv.insertAdjacentHTML(
                "beforeend",
                `
                    <p class="empty-message" style="text-align: center; padding: 30px; color: #64748b; font-weight: 600;">
                        No teams matching filter criteria found.
                    </p>
                `
            );
        }
        return;
    }

    const table = document.createElement("table");
    table.className = "teams-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>S.NO</th>
                <th>ID</th>
                <th>TEAM NAME</th>
                <th>NO OF MEMBERS</th>
                <th>SCHOOL NAME</th>
                <th>PROJECT NAME</th>
                <th>CATEGORY</th>
                <th>MENTOR</th>
                <th>STATUS</th>
                <th>ACTION</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    teamsDiv.appendChild(table);
    const tableBody = table.querySelector("tbody");

    filteredTeamNames.forEach((teamName, index) => {
        const members = allStudents.filter(
            student => getStudentTeam(student) === teamName
        );
        const firstMember = members[0] || {};
        const teamId = teamName;
        const teamTitle = members.find(m => m.teamTitle || m.customTeamName || m.team_name)?.teamTitle || 
                          members.find(m => m.customTeamName)?.customTeamName || 
                          members.find(m => m.team_name)?.team_name || 
                          teamName;
        const school = members.find(m => m.school && m.school !== "N/A")?.school || firstMember.school || "N/A";
        const project = members.find(m => m.projectTitle && m.projectTitle !== "N/A")?.projectTitle || firstMember.projectTitle || "N/A";
        const category = members.find(m => m.category && m.category !== "N/A")?.category || firstMember.category || "N/A";
        const mentor = members.find(m => m.mentor && m.mentor !== "N/A")?.mentor || firstMember.mentor || "N/A";

        const totalMembers = members.length;
        const arrivedMembers = members.filter(isVerified).length;

        let statusHTML;
        if (totalMembers > 0 && arrivedMembers === totalMembers) {
            statusHTML = `<span class="status completed">Completed</span>`;
        } else if (arrivedMembers > 0) {
            statusHTML = `<span class="status partial">${arrivedMembers}/${totalMembers} Arrived</span>`;
        } else {
            statusHTML = `<span class="status pending">Not Arrived</span>`;
        }

        const row = document.createElement("tr");

        row.innerHTML = `
            <td style="font-weight: 800; color: #2563eb;">${index + 1}</td>
            <td><code class="team-id-code">${escapeHTML(teamId)}</code></td>
            <td>
                <span class="team-badge">
                    <span class="team-dot"></span>
                    ${escapeHTML(teamTitle.toUpperCase())}
                </span>
            </td>
            <td>
                <span class="member-count">${totalMembers} Members</span>
            </td>
            <td style="color: var(--text-primary); font-weight: 600; max-width: 240px; line-height: 1.5;">${escapeHTML(school)}</td>
            <td style="color: #0284c7; font-weight: 700; max-width: 200px;">${escapeHTML(project)}</td>
            <td style="color: #6366f1; font-weight: 700;">${escapeHTML(category)}</td>
            <td style="color: var(--text-secondary); font-weight: 600; white-space: nowrap;">${escapeHTML(mentor)}</td>
            <td>${statusHTML}</td>
            <td>
                <div class="team-actions">
                    <button class="view-btn" type="button">View</button>
                    <button class="edit-team-btn" type="button">Edit</button>
                    <button class="delete-team-btn" type="button">Delete</button>
                </div>
            </td>
        `;

        row.querySelector(".view-btn")?.addEventListener("click", () => {
            showTeam(teamName);
        });

        row.querySelector(".edit-team-btn")?.addEventListener("click", () => {
            showEditTeamForm(teamName);
        });

        row.querySelector(".delete-team-btn")?.addEventListener("click", () => {
            deleteTeam(teamName);
        });

        tableBody.appendChild(row);
    });
}

// ========================================
// EDIT TEAM FORM
// ========================================

function showEditTeamForm(originalTeamName) {
    if (!teamsDiv) return;

    const members = allStudents.filter(
        student => getStudentTeam(student) === originalTeamName
    );

    if (members.length === 0) {
        alert("Team not found.");
        showTeams();
        return;
    }

    const school = members.find(m => m.school && m.school !== "N/A")?.school || members[0]?.school || "";
    const project = members.find(m => m.projectTitle && m.projectTitle !== "N/A")?.projectTitle || members[0]?.projectTitle || "";
    const mentor = members.find(m => m.mentor && m.mentor !== "N/A")?.mentor || members[0]?.mentor || "";

    const memberCardsHTML = members.map((student, idx) => `
        <div class="member-input-card" data-member-id="${student.id || ''}">
            <div class="member-card-header">
                <span class="member-card-title">Member #${idx + 1}</span>
                ${members.length > 1 ? `<button type="button" class="remove-member-btn">Remove Item</button>` : ''}
            </div>
            <div class="member-card-grid">
                <div class="form-group">
                    <label>Student Name *</label>
                    <input type="text" class="member-name-input" value="${escapeHTML(student.studentName || '')}" placeholder="Full student name">
                </div>
                <div class="form-group">
                    <label>Participant No</label>
                    <input type="text" class="participant-input" value="${escapeHTML(student.participantNo || '')}" placeholder="e.g. P101">
                </div>
                <div class="form-group">
                    <label>Class / Division</label>
                    <input type="text" class="class-input" value="${escapeHTML(student.classDivision || '')}" placeholder="e.g. Class 10 - A">
                </div>
                <div class="form-group">
                    <label>Student Phone</label>
                    <input type="tel" class="phone-input" value="${escapeHTML(student.studentPhone || '')}" placeholder="e.g. 9876543210">
                </div>
            </div>
        </div>
    `).join("");

    teamsDiv.innerHTML = `
        <div class="add-team-card">
            <button id="backToTeamsBtn" class="back-btn" type="button">← Back to Teams</button>

            <div class="form-header">
                <h2>Edit Team Item: ${escapeHTML(originalTeamName)}</h2>
                <p class="form-subtitle">Modify school, project title, mentor, or student participant details below</p>
            </div>

            <div class="form-section">
                <h3>Excel Header Information</h3>
                <div class="team-details-grid">
                    <div class="form-group">
                        <label for="editTeamId">ID / Team ID *</label>
                        <input type="text" id="editTeamId" value="${escapeHTML(originalTeamName)}">
                    </div>
                    <div class="form-group">
                        <label for="editTeamTitle">TEAM NAME *</label>
                        <input type="text" id="editTeamTitle" value="${escapeHTML(members.find(m => m.teamTitle || m.customTeamName)?.teamTitle || members.find(m => m.customTeamName)?.customTeamName || originalTeamName)}">
                    </div>
                    <div class="form-group">
                        <label for="editSchool">SCHOOL NAME *</label>
                        <input type="text" id="editSchool" value="${escapeHTML(school)}">
                    </div>
                    <div class="form-group">
                        <label for="editProject">PROJECT NAME</label>
                        <input type="text" id="editProject" value="${escapeHTML(project)}">
                    </div>
                    <div class="form-group">
                        <label for="editMentor">MENTOR</label>
                        <input type="text" id="editMentor" value="${escapeHTML(mentor)}">
                    </div>
                    <div class="form-group">
                        <label for="editCategory">CATEGORY</label>
                        <select id="editCategory" style="width: 100%; padding: 11px 16px; border: 1.5px solid var(--border-color); border-radius: 12px; font-size: 14.5px; font-weight: 600; color: var(--text-primary); outline: none;">
                            <option value="">Select Category</option>
                            <option value="Software" ${members[0]?.category === 'Software' ? 'selected' : ''}>Software</option>
                            <option value="Hardware" ${members[0]?.category === 'Hardware' ? 'selected' : ''}>Hardware</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="members-form-header">
                    <h3>Team Member Items</h3>
                    <button id="addEditMemberBtn" class="add-member-btn" type="button">Add Member Item</button>
                </div>
                <div id="editMembers">
                    ${memberCardsHTML}
                </div>
            </div>

            <div class="form-actions">
                <button id="saveEditTeamBtn" class="save-team-btn" type="button">Save Changes</button>
                <button id="cancelEditBtn" class="cancel-team-btn" type="button">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById("backToTeamsBtn")?.addEventListener("click", showTeams);
    document.getElementById("cancelEditBtn")?.addEventListener("click", showTeams);

    document.getElementById("addEditMemberBtn")?.addEventListener("click", () => {
        const editMembersDiv = document.getElementById("editMembers");
        const count = editMembersDiv.querySelectorAll(".member-input-card").length + 1;
        editMembersDiv.insertAdjacentHTML("beforeend", createMemberInput(count));
        bindRemoveMemberButtons();
    });

    bindRemoveMemberButtons();

    document.getElementById("saveEditTeamBtn")?.addEventListener("click", () => {
        saveEditedTeam(originalTeamName, members);
    });
}

async function saveEditedTeam(originalTeamName, existingMembers) {
    const editTeamIdInput = document.getElementById("editTeamId") || document.getElementById("editTeamName");
    const editTeamTitleInput = document.getElementById("editTeamTitle");
    const schoolInput = document.getElementById("editSchool");
    const projectInput = document.getElementById("editProject");
    const mentorInput = document.getElementById("editMentor");
    const saveButton = document.getElementById("saveEditTeamBtn");

    if (!editTeamIdInput || !schoolInput) return;

    const newTeamId = editTeamIdInput.value.trim();
    const newTeamTitle = editTeamTitleInput ? editTeamTitleInput.value.trim() : newTeamId;
    const school = schoolInput.value.trim();
    const project = projectInput.value.trim();
    const mentor = mentorInput.value.trim();
    const categoryInput = document.getElementById("editCategory");
    const category = categoryInput?.value || "";

    if (!newTeamId || !school) {
        alert("Please enter Team ID and School Name.");
        return;
    }

    const memberCards = document.querySelectorAll("#editMembers .member-input-card");
    const updatedMembers = [];

    memberCards.forEach((card, idx) => {
        const studentName = card.querySelector(".member-name-input")?.value.trim() || "";
        const participantNo = card.querySelector(".participant-input")?.value.trim() || `P${idx + 1}`;
        const classDivision = card.querySelector(".class-input")?.value.trim() || "";
        const studentPhone = card.querySelector(".phone-input")?.value.trim() || "";

        if (studentName) {
            updatedMembers.push({
                studentName,
                participantNo,
                classDivision,
                studentPhone
            });
        }
    });

    if (updatedMembers.length === 0) {
        alert("Please enter at least one member name.");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "⏳ Updating Team Data...";

        // Delete old student documents for this team if team name changed or list modified
        for (const oldStudent of existingMembers) {
            if (oldStudent.id) {
                await deleteDoc(doc(db, "students", oldStudent.id));
            }
        }

        // Re-write updated student documents to Firestore
        for (let i = 0; i < updatedMembers.length; i++) {
            const m = updatedMembers[i];
            const safeTeam = newTeamId.replace(/[\/\s.#$\[\]]/g, "_");
            const safeStudent = m.studentName.replace(/[\/\s.#$\[\]]/g, "_");
            const studentId = `${safeTeam}_${safeStudent}_${i + 1}`;

            const studentData = {
                studentId,
                teamName: newTeamId,
                teamId: newTeamId,
                teamNo: newTeamId,
                teamTitle: newTeamTitle,
                customTeamName: newTeamTitle,
                school,
                projectTitle: project,
                mentor,
                studentName: m.studentName,
                participantNo: m.participantNo,
                classDivision: m.classDivision,
                studentPhone: m.studentPhone,
                category,
                verified: existingMembers[i]?.verified || false,
                arrived: existingMembers[i]?.arrived || false,
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, "students", studentId), studentData);
        }

        alert(`✅ Team "${newTeamName}" updated successfully!`);
        showDashboard();
        showTeams();

    } catch (err) {
        console.error("Save edit error:", err);
        alert("Failed to update team: " + err.message);
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "💾 Save Changes";
        }
    }
}

// ========================================
// SHOW TEAM DETAILS
// ========================================

function showTeam(teamName) {
    if (!teamsDiv) return;

    const members = allStudents.filter(
        student => getStudentTeam(student) === teamName
    );

    if (members.length === 0) {
        alert("Team not found.");
        showTeams();
        return;
    }

    const school = members.find(m => m.school && m.school !== "N/A")?.school || members[0]?.school || "Not Available";
    const project = members.find(m => m.projectTitle && m.projectTitle !== "N/A")?.projectTitle || members[0]?.projectTitle || "Not Available";
    const mentor = members.find(m => m.mentor && m.mentor !== "N/A")?.mentor || members[0]?.mentor || "Not Available";
    const category = members.find(m => m.category && m.category !== "N/A")?.category || members[0]?.category || "Not Specified";
    const arrivedCount = members.filter(isVerified).length;
    const allArrived = members.length > 0 && arrivedCount === members.length;

    teamsDiv.innerHTML = `
        <div class="team-view-hero" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%); color: white; padding: 32px 28px; border-radius: 24px; margin-bottom: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(30, 58, 138, 0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 22px;">
                <button id="backBtn" class="back-btn" type="button" style="background: rgba(255, 255, 255, 0.18); color: white; border: 1px solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px); margin-bottom: 0; padding: 10px 18px;">
                    ← Back to Desk
                </button>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <button id="markAllBtn" class="mark-all-btn" type="button" style="padding: 10px 18px; font-size: 13.5px; border-radius: 12px; font-weight: 750;">
                        ${allArrived ? "Mark All Unarrived" : "Mark All Arrived"}
                    </button>
                    <button id="editTeamBtn" class="edit-team-btn" type="button" style="padding: 10px 18px; font-size: 13.5px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px;">
                        Edit Team
                    </button>
                    <button id="reportBtn" class="report-btn" type="button" style="padding: 10px 18px; font-size: 13.5px; border-radius: 12px;">
                        PDF Report
                    </button>
                    <button id="deleteTeamBtn" class="delete-team-btn" type="button" style="padding: 10px 18px; font-size: 13.5px; border-radius: 12px;">
                        Delete
                    </button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                <span style="background: rgba(255,255,255,0.18); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; backdrop-filter: blur(10px);">
                    TEAM ID
                </span>
                <span style="background: ${allArrived ? '#dcfce7' : arrivedCount > 0 ? '#fef3c7' : '#fee2e2'}; color: ${allArrived ? '#15803d' : arrivedCount > 0 ? '#b45309' : '#dc2626'}; padding: 4px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 800;">
                    ${arrivedCount}/${members.length} ARRIVED (${allArrived ? 'Completed' : arrivedCount > 0 ? 'Partial' : 'Pending'})
                </span>
            </div>

            <h1 style="font-size: 32px; font-weight: 900; margin: 0 0 16px 0; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                ${escapeHTML(teamName.toUpperCase())}
            </h1>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; background: rgba(255, 255, 255, 0.12); padding: 18px 22px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(12px);">
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.75); font-weight: 700; margin-bottom: 3px;">School Name</div>
                    <div style="font-size: 14.5px; font-weight: 700; color: white;">${escapeHTML(school)}</div>
                </div>
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.75); font-weight: 700; margin-bottom: 3px;">Project Title</div>
                    <div style="font-size: 14.5px; font-weight: 700; color: #bae6fd;">${escapeHTML(project)}</div>
                </div>
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.75); font-weight: 700; margin-bottom: 3px;">Mentor / Guide</div>
                    <div style="font-size: 14.5px; font-weight: 700; color: #e0f2fe;">${escapeHTML(mentor)}</div>
                </div>
                <div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.75); font-weight: 700; margin-bottom: 3px;">Category</div>
                    <div style="font-size: 14.5px; font-weight: 700; color: #fdf4ff;">${escapeHTML(category)}</div>
                </div>
            </div>
        </div>

        <div class="team-members-container" style="background: white; border-radius: 24px; padding: 28px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px dashed #f1f5f9; flex-wrap: wrap; gap: 10px;">
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0;">
                    Team Participant Members (${members.length} Members)
                </h3>
                <span style="color: var(--text-muted); font-size: 13px; font-weight: 600;">
                    Click checkbox or card to update check-in status
                </span>
            </div>

            <div id="members" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;"></div>
        </div>
    `;

    document.getElementById("backBtn")?.addEventListener("click", showTeams);
    document.getElementById("editTeamBtn")?.addEventListener("click", () => showEditTeamForm(teamName));
    document.getElementById("reportBtn")?.addEventListener("click", () => generateReport(teamName, school, project, category, members));
    document.getElementById("deleteTeamBtn")?.addEventListener("click", () => deleteTeam(teamName, members));

    document.getElementById("markAllBtn")?.addEventListener("click", async () => {
        const targetValue = !allArrived;
        const markAllBtn = document.getElementById("markAllBtn");
        if (markAllBtn) {
            markAllBtn.disabled = true;
            markAllBtn.textContent = "Updating...";
        }

        try {
            for (const student of members) {
                await updateDoc(doc(db, "students", student.id), { verified: targetValue });
                student.verified = targetValue;
            }
            showDashboard();
            showTeam(teamName);
        } catch (error) {
            console.error("MARK ALL ERROR:", error);
            alert("Failed to update team: " + error.message);
            showTeam(teamName);
        }
    });

    const membersDiv = document.getElementById("members");

    members.forEach((student, index) => {
        const memberCard = document.createElement("div");
        memberCard.className = "student-profile-card";
        memberCard.style.cssText = `
            background: ${isVerified(student) ? '#f0fdf4' : '#f8fafc'};
            border: 1.5px solid ${isVerified(student) ? '#bbf7d0' : '#e2e8f0'};
            border-radius: 18px;
            padding: 20px;
            transition: all 0.25s ease;
            position: relative;
        `;

        memberCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 14px; background: ${isVerified(student) ? '#dcfce7' : '#eff6ff'}; color: ${isVerified(student) ? '#16a34a' : '#2563eb'}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;">
                        #${index + 1}
                    </div>
                    <div>
                        <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0;">
                            ${escapeHTML(student.studentName)}
                        </h4>
                        <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
                            ID: ${escapeHTML(student.participantNo || `P${index + 1}`)}
                        </span>
                    </div>
                </div>

                <span style="padding: 4px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 800; background: ${isVerified(student) ? '#dcfce7' : '#fee2e2'}; color: ${isVerified(student) ? '#15803d' : '#b91c1c'};">
                    ${isVerified(student) ? 'Arrived' : 'Pending'}
                </span>
            </div>

            ${student.studentPhone || student.classDivision ? `
                <div style="margin: 10px 0 14px 0; font-size: 12.5px; color: #64748b; display: flex; gap: 12px; flex-wrap: wrap;">
                    ${student.classDivision ? `<span>Class: <strong>${escapeHTML(student.classDivision)}</strong></span>` : ''}
                    ${student.studentPhone ? `<span>Phone: <strong>${escapeHTML(student.studentPhone)}</strong></span>` : ''}
                </div>
            ` : ''}

            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12.5px; font-weight: 700; color: var(--text-secondary);">Attendance Check-In</span>
                <label class="arrived-toggle" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 750; font-size: 13px; color: ${isVerified(student) ? '#15803d' : '#475569'}; background: ${isVerified(student) ? '#dcfce7' : '#f1f5f9'}; padding: 6px 14px; border-radius: 20px;">
                    <input type="checkbox" ${isVerified(student) ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--success); cursor: pointer;">
                    <span>${isVerified(student) ? 'Checked In' : 'Check In'}</span>
                </label>
            </div>
        `;

        const checkbox = memberCard.querySelector("input");

        checkbox.addEventListener("change", async () => {
            const newValue = checkbox.checked;
            checkbox.disabled = true;

            try {
                await updateDoc(doc(db, "students", student.id), { verified: newValue });
                student.verified = newValue;
                showDashboard();
                showTeam(teamName);
            } catch (error) {
                console.error("UPDATE ERROR:", error);
                checkbox.checked = !newValue;
                checkbox.disabled = false;
                alert("Firebase update failed:\n" + error.message);
            }
        });

        membersDiv.appendChild(memberCard);
    });
}

// ========================================
// INDIVIDUAL TEAM REPORT
// ========================================

function generateReport(
    teamName,
    school,
    project,
    category,
    members
) {
    const arrivedCount =
        members.filter(
            student =>
                isVerified(student)
        ).length;

    const totalMembers =
        members.length;

    const pendingCount =
        totalMembers - arrivedCount;

    const now =
        new Date();

    const date =
        now.toLocaleDateString("en-IN");

    const time =
        now.toLocaleTimeString("en-IN");

    const reportWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=800"
        );

    if (!reportWindow) {
        alert(
            "Please allow pop-ups for this website."
        );

        return;
    }

    const rows =
        members.map(
            (student, index) => {
                const arrived =
                    isVerified(student);

                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td>
                            ${escapeHTML(
                                student.studentName
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                student.participantNo ||
                                "N/A"
                            )}
                        </td>

                        <td class="${
                            arrived
                                ? "arrived"
                                : "not-arrived"
                        }">
                            ${
                                arrived
                                    ? "● ARRIVED"
                                    : "● NOT ARRIVED"
                            }
                        </td>
                    </tr>
                `;
            }
        ).join("");

    reportWindow.document.open();

    reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                NSCET Team Registration Report
            </title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 30px;
                    color: #1e293b;
                    font-family: Arial, sans-serif;
                    background: #f1f5f9;
                }

                .report {
                    max-width: 850px;
                    margin: auto;
                    padding: 30px;
                    background: white;
                    border-radius: 18px;
                }

                .header {
                    margin: -30px -30px 25px;
                    padding: 35px;
                    color: white;
                    text-align: center;
                    background:
                        linear-gradient(
                            135deg,
                            #312e81,
                            #4f46e5,
                            #2563eb
                        );
                }

                .header h1 {
                    margin: 0;
                    font-size: 30px;
                }

                .header h2 {
                    margin: 8px 0;
                    font-size: 18px;
                    font-weight: 500;
                }

                .info {
                    padding: 15px;
                    background: #f8fafc;
                    border-radius: 10px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(3, 1fr);
                    gap: 12px;
                    margin: 25px 0;
                }

                .summary-card {
                    padding: 15px;
                    border-radius: 10px;
                    text-align: center;
                }

                .summary-card strong {
                    display: block;
                    font-size: 25px;
                }

                .total {
                    color: #4338ca;
                    background: #eef2ff;
                }

                .arrived {
                    color: #15803d;
                    background: #dcfce7;
                }

                .pending,
                .not-arrived {
                    color: #dc2626;
                    background: #fee2e2;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    padding: 12px;
                    border-bottom:
                        1px solid #e2e8f0;
                    text-align: left;
                }

                th {
                    color: #64748b;
                    background: #f1f5f9;
                    font-size: 12px;
                    text-transform: uppercase;
                }

                .actions {
                    margin-top: 25px;
                    text-align: center;
                }

                button {
                    padding: 12px 22px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                }

                .print {
                    color: white;
                    background: #4f46e5;
                }

                @media print {
                    body {
                        padding: 0;
                        background: white;
                    }

                    .report {
                        max-width: 100%;
                    }

                    .actions {
                        display: none;
                    }
                }
            </style>
        </head>

        <body>
            <div class="report">
                <div class="header">
                    <h1>
                        NSCET INNOVATE 24
                    </h1>

                    <h2>
                        Team Registration Report
                    </h2>
                </div>

                <h2>
                    ${escapeHTML(
                        teamName.toUpperCase()
                    )}
                </h2>

                <div class="info">
                    <p>
                        <strong>School:</strong>
                        ${escapeHTML(school)}
                    </p>

                    <p>
                        <strong>Project:</strong>
                        ${escapeHTML(project)}
                    </p>

                    <p>
                        <strong>Category:</strong>
                        ${escapeHTML(category)}
                    </p>
                </div>

                <div class="summary">
                    <div class="summary-card total">
                        <strong>
                            ${totalMembers}
                        </strong>
                        Total Members
                    </div>

                    <div class="summary-card arrived">
                        <strong>
                            ${arrivedCount}
                        </strong>
                        Arrived
                    </div>

                    <div class="summary-card pending">
                        <strong>
                            ${pendingCount}
                        </strong>
                        Pending
                    </div>
                </div>

                <h3>Team Members</h3>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Participant No</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <p>
                    Generated:
                    ${date} ${time}
                </p>

                <div class="actions">
                    <button
                        class="print"
                        type="button"
                        onclick="window.print()"
                    >
                        🖨️ Print / Save PDF
                    </button>
                </div>
            </div>
        </body>
        </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
}

// ========================================
// OVERALL REPORT
// ========================================

function generateOverallReport() {
    try {
        if (
            !allStudents ||
            allStudents.length === 0
        ) {
            alert(
                "No student data is loaded. " +
                "Please wait and try again."
            );

            return;
        }

        const reportWindow =
            window.open(
                "",
                "_blank",
                "width=1100,height=800"
            );

        if (!reportWindow) {
            alert(
                "The overall report was blocked. " +
                "Please allow pop-ups for this website."
            );

            return;
        }

        const teamNames =
            getTeamNames();

        const totalTeams =
            teamNames.length;

        const totalStudents =
            allStudents.length;

        const totalSchools =
            new Set(
                allStudents
                    .map(
                        student =>
                            (student.school ? String(student.school).trim() : "")
                    )
                    .filter(Boolean)
            ).size;

        const arrivedStudents =
            allStudents.filter(
                student =>
                    isVerified(student)
            ).length;

        const pendingStudents =
            totalStudents - arrivedStudents;

        const generatedAt =
            new Date().toLocaleString("en-IN");

        const teamRows =
            teamNames.map(
                (teamName, index) => {
                    const members =
                        allStudents.filter(
                            student =>
                                (student.teamName ? String(student.teamName).trim() : "") === teamName
                        );

                    const totalMembers =
                        members.length;

                    const arrivedMembers =
                        members.filter(
                            student =>
                                isVerified(student)
                        ).length;

                    const pendingMembers =
                        totalMembers -
                        arrivedMembers;

                    let statusText =
                        "Not Arrived";

                    let statusClass =
                        "pending";

                    if (
                        totalMembers > 0 &&
                        arrivedMembers ===
                            totalMembers
                    ) {
                        statusText =
                            "Completed";

                        statusClass =
                            "completed";

                    } else if (
                        arrivedMembers > 0
                    ) {
                        statusText =
                            `${arrivedMembers}/` +
                            `${totalMembers} Arrived`;

                        statusClass =
                            "partial";
                    }

                    const firstMember = members[0] || {};
                    const teamId = firstMember.studentId || firstMember.id || teamName;
                    const school = firstMember.school || "N/A";
                    const project = firstMember.projectTitle || "N/A";
                    const mentor = firstMember.mentor || "N/A";

                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td><code>${escapeHTML(teamId)}</code></td>
                            <td><strong>${escapeHTML(teamName)}</strong></td>
                            <td>${totalMembers}</td>
                            <td>${escapeHTML(school)}</td>
                            <td>${escapeHTML(project)}</td>
                            <td>${escapeHTML(mentor)}</td>
                            <td>
                                <span class="status ${statusClass}">
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                    `;
                }
            ).join("");

        reportWindow.document.open();

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NSCET Overall Registration Report</title>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 30px; color: #1e293b; font-family: "Segoe UI", Arial, sans-serif; background: #f1f5f9; }
                    .report-container { max-width: 1100px; margin: auto; overflow: hidden; background: white; border-radius: 20px; box-shadow: 0 15px 40px rgba(15, 23, 42, 0.12); }
                    .report-header { padding: 35px; color: white; text-align: center; background: linear-gradient(135deg, #0f172a, #1e3a8a, #1d4ed8); }
                    .report-header h1 { margin: 0; font-size: 30px; font-weight: 800; }
                    .report-header h2 { margin: 8px 0; font-size: 19px; font-weight: 500; }
                    .report-header p { margin: 5px 0 0; font-size: 13px; opacity: 0.85; }
                    .report-content { padding: 30px; }
                    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 25px 0 30px; }
                    .summary-card { padding: 18px 10px; border-radius: 12px; text-align: center; }
                    .summary-number { display: block; margin-bottom: 5px; font-size: 28px; font-weight: 800; }
                    .blue { color: #1e3a8a; background: #eff6ff; }
                    .green { color: #15803d; background: #dcfce7; }
                    .orange { color: #b45309; background: #fef3c7; }
                    .pink { color: #be185d; background: #fce7f3; }
                    .table-wrapper { overflow-x: auto; }
                    table { width: 100%; min-width: 760px; border-collapse: collapse; }
                    th, td { padding: 13px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                    th { color: #64748b; background: #f1f5f9; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase; }
                    tbody tr:hover { background: #f8fafc; }
                    .status { display: inline-block; padding: 6px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
                    .completed { color: #15803d; background: #dcfce7; }
                    .partial { color: #b45309; background: #fef3c7; }
                    .pending { color: #dc2626; background: #fee2e2; }
                    .footer { display: flex; justify-content: space-between; gap: 15px; margin-top: 25px; padding-top: 20px; color: #64748b; border-top: 1px solid #e2e8f0; font-size: 12px; }
                    .actions { display: flex; justify-content: center; gap: 10px; margin-top: 25px; }
                    button { padding: 12px 22px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; }
                    .print-btn { color: white; background: linear-gradient(135deg, #4f46e5, #2563eb); }
                    .close-btn { color: #334155; background: #e2e8f0; }
                    @media print { body { padding: 0; background: white; } .report-container { max-width: 100%; box-shadow: none; } .actions { display: none; } }
                </style>
            </head>

            <body>
                <div class="report-container">
                    <div class="report-header">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 10px;">
                            <img src="College_logo.webp" alt="College Logo" style="width: 76px; height: 76px; object-fit: contain; border-radius: 50%; background: white; padding: 5px; border: 2px solid #fbbf24;">
                            <div style="text-align: left;">
                                <h1 style="margin: 0; font-size: 26px; font-weight: 800;">NSCET INNOVATE 24</h1>
                                <h2 style="margin: 4px 0 0; font-size: 18px; font-weight: 600;">Overall Registration Report</h2>
                            </div>
                        </div>
                        <p>Hackathon Registration Desk</p>
                    </div>

                    <div class="report-content">
                        <h2>Registration Summary</h2>
                        <div class="summary">
                            <div class="summary-card blue"><span class="summary-number">${totalTeams}</span>Total Teams</div>
                            <div class="summary-card blue"><span class="summary-number">${totalStudents}</span>Total Students</div>
                            <div class="summary-card pink"><span class="summary-number">${totalSchools}</span>Total Schools</div>
                            <div class="summary-card green"><span class="summary-number">${arrivedStudents}</span>Arrived Students</div>
                            <div class="summary-card orange"><span class="summary-number">${pendingStudents}</span>Pending Students</div>
                        </div>

                        <h2>Registered Teams</h2>
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>S.NO</th>
                                        <th>ID</th>
                                        <th>TEAM NAME</th>
                                        <th>NO OF MEMBERS</th>
                                        <th>SCHOOL NAME</th>
                                        <th>PROJECT NAME</th>
                                        <th>MENTOR</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${teamRows}
                                </tbody>
                            </table>
                        </div>

                                <tbody>
                                    ${teamRows}
                                </tbody>
                            </table>
                        </div>

                        <div class="footer">
                            <span>
                                Generated:
                                ${generatedAt}
                            </span>

                            <span>
                                NSCET Registration Desk
                            </span>
                        </div>

                        <div class="actions">
                            <button
                                class="print-btn"
                                type="button"
                                onclick="window.print()"
                            >
                                🖨️ Print / Save PDF
                            </button>

                            <button
                                class="close-btn"
                                type="button"
                                onclick="window.close()"
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);

        reportWindow.document.close();
        reportWindow.focus();

    } catch (error) {
        console.error(
            "OVERALL REPORT ERROR:",
            error
        );

        alert(
            "Overall report generation failed:\n" +
            error.message
        );
    }
}

// ========================================
// EXPORT DATA FUNCTIONS (Excel, CSV, PDF)
// ========================================

function prepareExportData() {
    const allTeamNames = getTeamNames();
    
    return allTeamNames.map((teamName, index) => {
        const members = allStudents.filter(
            student => getStudentTeam(student) === teamName
        );
        const firstMember = members[0] || {};
        const teamId = firstMember.studentId || firstMember.id || teamName;
        const school = firstMember.school || "N/A";
        const project = firstMember.projectTitle || "N/A";
        const category = firstMember.category || "N/A";
        const mentor = firstMember.mentor || "N/A";
        const totalMembers = members.length;
        const arrivedMembers = members.filter(isVerified).length;
        const pendingMembers = totalMembers - arrivedMembers;

        let statusText = "Not Arrived";
        if (totalMembers > 0 && arrivedMembers === totalMembers) {
            statusText = "Completed";
        } else if (arrivedMembers > 0) {
            statusText = `${arrivedMembers}/${totalMembers} Arrived`;
        }

        return {
            "S.NO": index + 1,
            "ID": teamId,
            "TEAM NAME": teamName,
            "NO OF MEMBERS": totalMembers,
            "SCHOOL NAME": school,
            "PROJECT NAME": project,
            "CATEGORY": category,
            "MENTOR": mentor,
            "ARRIVED MEMBERS": arrivedMembers,
            "PENDING MEMBERS": pendingMembers,
            "STATUS": statusText
        };
    });
}

function exportToExcel() {
    const data = prepareExportData();
    if (data.length === 0) {
        alert("No team items available to export.");
        return;
    }

    if (typeof XLSX === "undefined") {
        alert("Excel export library is loading, please try again in a moment.");
        return;
    }

    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Teams Report");

        // Column widths auto calculation
        worksheet["!cols"] = [
            { wch: 6 },  // S.NO
            { wch: 20 }, // ID
            { wch: 24 }, // TEAM NAME
            { wch: 16 }, // NO OF MEMBERS
            { wch: 28 }, // SCHOOL NAME
            { wch: 28 }, // PROJECT NAME
            { wch: 15 }, // CATEGORY
            { wch: 22 }, // MENTOR
            { wch: 18 }, // ARRIVED MEMBERS
            { wch: 18 }, // PENDING MEMBERS
            { wch: 16 }  // STATUS
        ];

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `NSCET_INNOVATE_24_Export_${dateStr}.xlsx`);
    } catch (err) {
        console.error("Excel Export Error:", err);
        alert("Failed to export Excel file: " + err.message);
    }
}

function exportToCSV() {
    const data = prepareExportData();
    if (data.length === 0) {
        alert("No team items available to export.");
        return;
    }

    const headers = ["S.NO", "ID", "TEAM NAME", "NO OF MEMBERS", "SCHOOL NAME", "PROJECT NAME", "CATEGORY", "MENTOR", "ARRIVED MEMBERS", "PENDING MEMBERS", "STATUS"];
    const csvRows = [];
    
    // Header row
    csvRows.push(headers.join(","));

    // Data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header] !== undefined ? String(row[header]) : "";
            const escaped = val.replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NSCET_INNOVATE_24_Export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ========================================
// CLEAR ALL DATABASE RECORDS
// ========================================

async function clearAllDatabaseRecords() {
    const confirmed = confirm(
        "⚠️ CRITICAL WARNING: Are you sure you want to DELETE ALL DATABASE RECORDS COMPLETELY?\n\n" +
        "This will permanently erase all registered teams, students, schools, projects, and check-in records from Firebase Firestore."
    );
    if (!confirmed) return;

    try {
        const snapshot = await getDocs(studentsCollection);
        let count = 0;
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "students", docSnap.id));
            count++;
        }
        alert(`Database completely cleared! (${count} records permanently deleted).`);
        allStudents = [];
        showDashboard();
        showTeams();
    } catch (error) {
        console.error("CLEAR DB ERROR:", error);
        alert("Failed to clear database: " + error.message);
    }
}

// ========================================
// BUTTON EVENTS
// ========================================

overallReportButton?.addEventListener(
    "click",
    generateOverallReport
);

document.getElementById("exportExcelBtn")?.addEventListener("click", exportToExcel);
document.getElementById("exportCsvBtn")?.addEventListener("click", exportToCSV);
document.getElementById("clearDbBtn")?.addEventListener("click", clearAllDatabaseRecords);

// ========================================
// START APPLICATION
// ========================================

loadStudents();