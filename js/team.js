import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const teamNo = urlParams.get("team") || localStorage.getItem("teamNo");

const teamNoElement = document.getElementById("teamNo");
const schoolElement = document.getElementById("school");
const projectElement = document.getElementById("project");
const membersElement = document.getElementById("members");

let members = [];

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

async function loadTeam() {
    if (!teamNo) {
        membersElement.innerHTML = "No team specified.";
        return;
    }

    try {
        const snapshot = await getDocs(
            collection(db, "students")
        );

        members = [];
        snapshot.forEach((document) => {
            const student = document.data();
            const teamKey = (student.teamName || student.teamNo || "").trim();

            if (teamKey === teamNo.trim()) {
                members.push({
                    id: document.id,
                    ...student
                });
            }
        });

        if (members.length === 0) {
            membersElement.innerHTML = "No members found.";
            return;
        }

        teamNoElement.textContent = "Team: " + teamNo;
        schoolElement.textContent = members[0].school || "N/A";
        projectElement.textContent = members[0].projectTitle || "N/A";

        membersElement.innerHTML = "";

        members.forEach((student, index) => {
            const div = document.createElement("div");
            div.className = "member";

            const arrived = isVerified(student);

            div.innerHTML = `
                <div>
                    <strong>${index + 1}. ${student.studentName}</strong>
                    <div style="font-size: 12px; color: #64748b;">Participant No: ${student.participantNo || "N/A"}</div>
                </div>

                <label style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 700; color: ${arrived ? '#15803d' : '#dc2626'};">
                    <input
                        type="checkbox"
                        ${arrived ? "checked" : ""}
                        data-id="${student.id}"
                    >
                    Arrived
                </label>
            `;

            const checkbox = div.querySelector("input");

            checkbox.addEventListener("change", async () => {
                const newValue = checkbox.checked;
                checkbox.disabled = true;

                try {
                    await updateDoc(
                        doc(db, "students", student.id),
                        {
                            verified: newValue,
                            arrived: newValue
                        }
                    );
                    student.verified = newValue;
                    student.arrived = newValue;
                    loadTeam();
                } catch (error) {
                    console.error("Update failed:", error);
                    checkbox.checked = !newValue;
                    checkbox.disabled = false;
                    alert("Update failed: " + error.message);
                }
            });

            membersElement.appendChild(div);
        });
    } catch (error) {
        console.error("Load team error:", error);
        membersElement.innerHTML = `<div style="color: red;">Failed to load team: ${error.message}</div>`;
    }
}

loadTeam();

window.generateReport = function () {
    const arrivedCount = members.filter(isVerified).length;
    const totalMembers = members.length;
    const school = members[0]?.school || "N/A";
    const project = members[0]?.projectTitle || "N/A";
    const date = new Date().toLocaleDateString("en-IN");
    const time = new Date().toLocaleTimeString("en-IN");

    const newWindow = window.open("", "_blank", "width=800,height=700");
    if (!newWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    const rows = members.map((student, index) => {
        const arrived = isVerified(student);
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${index + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${student.studentName}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${student.participantNo || "N/A"}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${arrived ? '#15803d' : '#dc2626'}; font-weight: bold;">
                    ${arrived ? "● ARRIVED" : "● NOT ARRIVED"}
                </td>
            </tr>
        `;
    }).join("");

    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Team Registration Report - ${teamNo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #f8fafc; }
                .card { max-width: 700px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
                h1 { color: #1e3a8a; margin-top: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; padding: 10px; background: #f1f5f9; color: #64748b; font-size: 12px; text-transform: uppercase; }
                .btn { margin-top: 25px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                @media print { .btn { display: none; } }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🚀 NSCET INNOVATE 24</h1>
                <h2>Team Registration Report: ${teamNo}</h2>
                <p><strong>School:</strong> ${school}</p>
                <p><strong>Project:</strong> ${project}</p>
                <p><strong>Attendance:</strong> ${arrivedCount} / ${totalMembers} Arrived</p>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Student Name</th>
                            <th>Participant No</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Generated: ${date} ${time}</p>
                <button class="btn" onclick="window.print()">🖨️ Print / Save PDF</button>
            </div>
        </body>
        </html>
    `);

    newWindow.document.close();
};