import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function getStudentTeam(student) {
    if (!student) return "General Registration";
    const team = (
        student.teamName ||
        student.teamNo ||
        student.Form ||
        student.team_name ||
        student.team ||
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

function loadDashboard() {
    try {
        console.log("Listening for dashboard real-time updates...");

        onSnapshot(collection(db, "students"), (snapshot) => {
            const students = snapshot.docs.map(docSnap => docSnap.data());

            const totalStudents = students.length;

            const teamNames = [
                ...new Set(
                    students
                        .map(student => getStudentTeam(student))
                        .filter(Boolean)
                )
            ];

            const totalTeams = teamNames.length;
            let arrivedTeams = 0;

            teamNames.forEach((teamName) => {
                const members = students.filter(
                    student => getStudentTeam(student) === teamName
                );

                const allArrived =
                    members.length > 0 &&
                    members.every(isVerified);

                if (allArrived) {
                    arrivedTeams++;
                }
            });

            const pendingTeams = totalTeams - arrivedTeams;

            const schools = [
                ...new Set(
                    students
                        .map(student => (student.school ? String(student.school).trim() : null))
                        .filter(Boolean)
                )
            ];

            const totalSchools = schools.length;

            document.getElementById("totalTeams").textContent = totalTeams;
            document.getElementById("arrivedTeams").textContent = arrivedTeams;
            document.getElementById("pendingTeams").textContent = pendingTeams;
            document.getElementById("totalStudents").textContent = totalStudents;
            document.getElementById("totalSchools").textContent = totalSchools;

            setupSchoolsModal(students);
            setupStudentsModal(students);
            renderVisualAnalytics(students);

            console.log({ totalTeams, arrivedTeams, pendingTeams, totalStudents, totalSchools });
        }, (error) => {
            console.error("Dashboard realtime error:", error);
        });

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

function renderVisualAnalytics(students) {
    const arrivedStudents = students.filter(isVerified).length;
    const totalStudents = students.length;
    const pendingStudents = totalStudents - arrivedStudents;
    const percentage = totalStudents > 0 ? Math.round((arrivedStudents / totalStudents) * 100) : 0;

    const percentElem = document.getElementById("attendancePercent");
    const ratioElem = document.getElementById("attendanceRatioText");
    const progressElem = document.getElementById("attendanceProgressBar");
    const arrivedElem = document.getElementById("arrivedStudentsCount");
    const pendingElem = document.getElementById("pendingStudentsCount");

    if (percentElem) percentElem.textContent = `${percentage}%`;
    if (ratioElem) ratioElem.textContent = `${arrivedStudents} / ${totalStudents} Students Arrived`;
    if (progressElem) progressElem.style.width = `${percentage}%`;
    if (arrivedElem) arrivedElem.textContent = arrivedStudents;
    if (pendingElem) pendingElem.textContent = pendingStudents;

    const topSchoolsBody = document.getElementById("topSchoolsTableBody");
    if (!topSchoolsBody) return;

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

    const topSchools = Object.values(schoolMap)
        .sort((a, b) => b.totalStudents - a.totalStudents)
        .slice(0, 5);

    if (topSchools.length === 0) {
        topSchoolsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No school data available.</td></tr>`;
        return;
    }

    topSchoolsBody.innerHTML = topSchools.map((item, idx) => {
        const rate = Math.round((item.arrivedStudents / item.totalStudents) * 100);
        return `
            <tr>
                <td style="font-weight: 800; color: #2563eb;">${idx + 1}</td>
                <td style="font-weight: 700; color: var(--text-primary); max-width: 220px; line-height: 1.3;">${escapeHTML(item.schoolName)}</td>
                <td><span class="member-count">${item.teams.size} ${item.teams.size === 1 ? 'Team' : 'Teams'}</span></td>
                <td><span style="font-weight: 800; color: var(--text-primary);">${item.totalStudents}</span></td>
                <td>
                    <span class="status ${rate === 100 ? 'completed' : rate > 0 ? 'partial' : 'pending'}">
                        ${rate}% (${item.arrivedStudents}/${item.totalStudents})
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
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
                        No student records found matching search criteria.
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

loadDashboard();