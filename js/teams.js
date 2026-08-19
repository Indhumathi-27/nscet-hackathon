import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const teamsDiv = document.getElementById("teams");

function getStudentTeam(student) {
    const team = (
        student.teamName ||
        student.teamNo ||
        student.Form ||
        student.team ||
        ""
    ).trim();

    if (team) return team;
    if (student.school && student.school.trim() && student.school.trim() !== "N/A") {
        return `School: ${student.school.trim()}`;
    }
    return "General Registration";
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

function loadTeams() {
    try {
        console.log("Listening for real-time teams directory updates...");

        onSnapshot(collection(db, "students"), (snapshot) => {
            const teams = {};

            snapshot.forEach((doc) => {
                const student = doc.data();
                const teamKey = getStudentTeam(student);

                if (!teams[teamKey]) {
                    teams[teamKey] = [];
                }

                teams[teamKey].push(student);
            });

            teamsDiv.innerHTML = "";

            const teamKeys = Object.keys(teams);

            if (teamKeys.length === 0) {
                teamsDiv.innerHTML = `<p style="text-align: center; color: #64748b;">No registered teams found.</p>`;
                return;
            }

            teamKeys.forEach((teamKey) => {
                const members = teams[teamKey];
                const school = members[0]?.school || "N/A";
                const project = members[0]?.projectTitle || "N/A";
                const arrivedCount = members.filter(isVerified).length;
                const total = members.length;

                const div = document.createElement("div");
                div.className = "team";

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>${teamKey}</h3>
                        <span style="font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: 700; background: ${arrivedCount === total ? '#dcfce7' : arrivedCount > 0 ? '#fef3c7' : '#fee2e2'}; color: ${arrivedCount === total ? '#15803d' : arrivedCount > 0 ? '#b45309' : '#dc2626'};">
                            ${arrivedCount}/${total} Arrived
                        </span>
                    </div>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #64748b;">🏫 ${school}</p>
                    <p style="margin: 2px 0 0; font-size: 13px; color: #64748b;">💡 ${project}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #475569; font-weight: 600;">👥 ${total} Members</p>
                `;

                div.onclick = () => {
                    localStorage.setItem("teamNo", teamKey);
                    window.location.href = `team.html?team=${encodeURIComponent(teamKey)}`;
                };

                teamsDiv.appendChild(div);
            });
        }, (error) => {
            console.error("Teams realtime error:", error);
            teamsDiv.innerHTML = `<div style="color: #b91c1c; background: #fee2e2; padding: 15px; border-radius: 8px;">❌ Failed to load teams: ${error.message}</div>`;
        });
    } catch (error) {
        console.error("Teams load error:", error);
    }
}

loadTeams();