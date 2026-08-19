import {
    collection,
    getDocs,
    updateDoc,
    doc,
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
    return (student.teamName || student.teamNo || "").trim();
}

function isVerified(student) {
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
// LOAD STUDENTS
// ========================================

async function loadStudents() {
    try {
        console.log("Loading students from Firebase...");

        const snapshot = await getDocs(
            studentsCollection
        );

        allStudents = snapshot.docs.map(
            documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            })
        );

        console.log(
            "Students found:",
            allStudents.length
        );

        console.table(allStudents);

        showDashboard();
        showTeams();

    } catch (error) {
        console.error(
            "FIREBASE LOAD ERROR:",
            error
        );

        if (teamsDiv) {
            teamsDiv.innerHTML = `
                <div class="firebase-error">
                    <strong>
                        ❌ Failed to load students.
                    </strong>

                    <br><br>

                    ${escapeHTML(error.message)}

                    <br><br>

                    Check your internet connection,
                    Firebase configuration,
                    Firestore rules, and collection name.
                </div>
            `;
        }
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
            .map(student => student.school?.trim())
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
}

// ========================================
// ADD TEAM ITEM FORM
// ========================================

function createMemberInput(number) {
    return `
        <div class="member-input-card" data-member-index="${number}">
            <div class="member-card-header">
                <span class="member-card-title">👤 Member Item #${number}</span>
                ${number > 1 ? `<button type="button" class="remove-member-btn">🗑️ Remove Item</button>` : ''}
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
                <h2>➕ Add New Team Item</h2>
                <p class="form-subtitle">Register a new team, project, mentor, and student participant items into Firebase</p>
            </div>

            <div class="form-section">
                <h3>📌 Team Details</h3>

                <div class="team-details-grid">
                    <div class="form-group">
                        <label for="newTeamName">Team Name *</label>
                        <input type="text" id="newTeamName" placeholder="Example: Code Craft">
                    </div>

                    <div class="form-group">
                        <label for="newSchool">School Name *</label>
                        <input type="text" id="newSchool" placeholder="Enter school name">
                    </div>

                    <div class="form-group">
                        <label for="newProject">Project Title</label>
                        <input type="text" id="newProject" placeholder="Enter project title">
                    </div>

                    <div class="form-group">
                        <label for="newMentor">Mentor Name</label>
                        <input type="text" id="newMentor" placeholder="Enter mentor name">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="members-form-header">
                    <h3>👥 Team Member Items</h3>

                    <button
                        id="addMemberBtn"
                        class="add-member-btn"
                        type="button"
                    >
                        ➕ Add Member Item
                    </button>
                </div>

                <div id="newMembers">
                    ${createMemberInput(1)}
                </div>
            </div>

            <div class="form-actions">
                <button
                    id="saveTeamBtn"
                    class="save-team-btn"
                    type="button"
                >
                    💾 Save Team Item
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
            title.textContent = `👤 Member Item #${index + 1}`;
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
    const teamNameInput = document.getElementById("newTeamName");
    const schoolInput = document.getElementById("newSchool");
    const projectInput = document.getElementById("newProject");
    const mentorInput = document.getElementById("newMentor");
    const messageDiv = document.getElementById("addTeamMessage");
    const saveButton = document.getElementById("saveTeamBtn");

    if (!teamNameInput || !schoolInput) return;

    const teamName = teamNameInput.value.trim();
    const school = schoolInput.value.trim();
    const project = projectInput?.value.trim() || "";
    const mentor = mentorInput?.value.trim() || "";

    if (!teamName) {
        alert("Please enter team name.");
        teamNameInput.focus();
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
        saveButton.textContent = "⏳ Saving Team Item...";

        for (let i = 0; i < validMembers.length; i++) {
            const member = validMembers[i];
            const studentId = `${teamName}_${member.participantNo || i + 1}`.replace(/\s+/g, "_");

            const newStudent = {
                studentId,
                teamName,
                teamNo: teamName,
                school,
                projectTitle: project,
                mentor,
                studentName: member.studentName,
                participantNo: member.participantNo,
                classDivision: member.classDivision,
                studentPhone: member.studentPhone,
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
                ✅ Team Item "${escapeHTML(teamName)}" with ${validMembers.length} member(s) saved successfully!
            </div>
        `;

        showDashboard();
        setTimeout(showTeams, 800);

    } catch (error) {
        console.error("SAVE TEAM ERROR:", error);
        messageDiv.innerHTML = `
            <div class="firebase-error">
                ❌ Failed to save team: ${escapeHTML(error.message)}
            </div>
        `;
        saveButton.disabled = false;
        saveButton.textContent = "💾 Save Team Item";
    }
}


// ========================================
// DELETE TEAM
// ========================================

async function deleteTeam(teamName) {

    const teamMembers = allStudents.filter(
        student =>
            student.teamName?.trim() === teamName
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
                    student.teamName?.trim() !== teamName
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
            <h2>📋 Registered Teams (${filteredTeamNames.length} of ${allTeamNames.length})</h2>

            <button
                id="addTeamBtn"
                class="add-team-btn"
                type="button"
            >
                ➕ Add Team
            </button>
        </div>

        <div class="search-filter-bar">
            <div class="search-input-wrapper">
                <span class="search-icon">🔍</span>
                <input
                    type="text"
                    id="teamSearchInput"
                    placeholder="Search team name, student, school, project..."
                    value="${escapeHTML(searchQuery)}"
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
        teamsDiv.insertAdjacentHTML(
            "beforeend",
            `
                <p class="empty-message">
                    No matching teams found.
                </p>
            `
        );
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
        const teamId = firstMember.studentId || firstMember.id || teamName;
        const school = firstMember.school || "N/A";
        const project = firstMember.projectTitle || "N/A";
        const mentor = firstMember.mentor || "N/A";

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
            <td><strong>${index + 1}</strong></td>
            <td><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #475569; font-weight: 600;">${escapeHTML(teamId)}</code></td>
            <td>
                <span class="team-badge">
                    <span class="team-dot"></span>
                    ${escapeHTML(teamName.toUpperCase())}
                </span>
            </td>
            <td>
                <span class="member-count">👥 ${totalMembers}</span>
            </td>
            <td>${escapeHTML(school)}</td>
            <td>${escapeHTML(project)}</td>
            <td>${escapeHTML(mentor)}</td>
            <td>${statusHTML}</td>
            <td>
                <div class="team-actions">
                    <button class="view-btn" type="button">View</button>
                    <button class="delete-team-btn" type="button">🗑️ Delete</button>
                </div>
            </td>
        `;

        row.querySelector(".view-btn")?.addEventListener("click", () => {
            showTeam(teamName);
        });

        row.querySelector(".delete-team-btn")?.addEventListener("click", () => {
            deleteTeam(teamName);
        });

        tableBody.appendChild(row);
    });
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

    const school = members[0].school || "Not Available";
    const project = members[0].projectTitle || "Not Available";
    const arrivedCount = members.filter(isVerified).length;
    const allArrived = members.length > 0 && arrivedCount === members.length;

    teamsDiv.innerHTML = `
        <div class="details-card">
            <button id="backBtn" class="back-btn" type="button">← Back</button>

            <h2>${escapeHTML(teamName.toUpperCase())}</h2>

            <div class="team-info">
                <p><strong>School:</strong> ${escapeHTML(school)}</p>
                <p><strong>Project:</strong> ${escapeHTML(project)}</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <h3>Team Members (${arrivedCount}/${members.length} Arrived)</h3>
                <button id="markAllBtn" class="mark-all-btn" type="button">
                    ${allArrived ? "❌ Mark All Unarrived" : "✅ Mark All Arrived"}
                </button>
            </div>

            <div id="members"></div>

            <div class="team-detail-actions">
                <button id="reportBtn" class="report-btn" type="button">📄 Generate Report</button>
                <button id="deleteTeamBtn" class="delete-team-btn" type="button">🗑️ Delete Team</button>
            </div>
        </div>
    `;

    document.getElementById("backBtn")?.addEventListener("click", showTeams);

    // FIX: Attach event listener to report button!
    document.getElementById("reportBtn")?.addEventListener("click", () => {
        generateReport(teamName, school, project, members);
    });

    document.getElementById("deleteTeamBtn")?.addEventListener("click", () => {
        deleteTeam(teamName);
    });

    // Mark All Arrived / Unarrived handler
    document.getElementById("markAllBtn")?.addEventListener("click", async () => {
        const targetValue = !allArrived;
        const markAllBtn = document.getElementById("markAllBtn");
        if (markAllBtn) {
            markAllBtn.disabled = true;
            markAllBtn.textContent = "⏳ Updating...";
        }

        try {
            for (const student of members) {
                await updateDoc(doc(db, "students", student.id), {
                    verified: targetValue
                });
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
        const memberDiv = document.createElement("div");
        memberDiv.className = "member";

        memberDiv.innerHTML = `
            <div>
                <div class="member-name">
                    ${index + 1}. ${escapeHTML(student.studentName)}
                </div>
                <div class="member-id">
                    Participant No: ${escapeHTML(student.participantNo || "N/A")}
                </div>
            </div>

            <label class="arrived">
                <input type="checkbox">
                Arrived
            </label>
        `;

        const checkbox = memberDiv.querySelector("input");
        checkbox.checked = isVerified(student);

        checkbox.addEventListener("change", async () => {
            const newValue = checkbox.checked;
            checkbox.disabled = true;

            try {
                await updateDoc(doc(db, "students", student.id), {
                    verified: newValue
                });

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

        membersDiv.appendChild(memberDiv);
    });
}

// ========================================
// INDIVIDUAL TEAM REPORT
// ========================================

function generateReport(
    teamName,
    school,
    project,
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
                        🚀 NSCET INNOVATE 24
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
                            student.school?.trim()
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
                                student.teamName
                                    ?.trim() === teamName
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
                    .report-header { padding: 35px; color: white; text-align: center; background: linear-gradient(135deg, #312e81, #4f46e5, #2563eb); }
                    .report-header h1 { margin: 0; font-size: 30px; font-weight: 800; }
                    .report-header h2 { margin: 8px 0; font-size: 19px; font-weight: 500; }
                    .report-header p { margin: 5px 0 0; font-size: 13px; opacity: 0.85; }
                    .report-content { padding: 30px; }
                    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 25px 0 30px; }
                    .summary-card { padding: 18px 10px; border-radius: 12px; text-align: center; }
                    .summary-number { display: block; margin-bottom: 5px; font-size: 28px; font-weight: 800; }
                    .blue { color: #4338ca; background: #eef2ff; }
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
                        <h1>🚀 NSCET INNOVATE 24</h1>
                        <h2>Overall Registration Report</h2>
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

    const headers = ["S.NO", "ID", "TEAM NAME", "NO OF MEMBERS", "SCHOOL NAME", "PROJECT NAME", "MENTOR", "ARRIVED MEMBERS", "PENDING MEMBERS", "STATUS"];
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
// BUTTON EVENTS
// ========================================

overallReportButton?.addEventListener(
    "click",
    generateOverallReport
);

document.getElementById("exportExcelBtn")?.addEventListener("click", exportToExcel);
document.getElementById("exportCsvBtn")?.addEventListener("click", exportToCSV);

// ========================================
// START APPLICATION
// ========================================

loadStudents();