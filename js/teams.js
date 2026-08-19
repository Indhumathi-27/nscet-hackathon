import { db } from "./firebase.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const teamsDiv = document.getElementById("teams");

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

async function loadTeams() {
    try {
        const snapshot = await getDocs(
            collection(db, "students")
        );

        const teams = {};

        snapshot.forEach((doc) => {
            const student = doc.data();
            const teamKey = (student.teamName || student.teamNo || "").trim();

            if (!teamKey) return;

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
                <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">👥 ${total} Members</p>
            `;

            div.onclick = () => {
                localStorage.setItem("teamNo", teamKey);
                window.location.href = `team.html?team=${encodeURIComponent(teamKey)}`;
            };

            teamsDiv.appendChild(div);
        });
    } catch (error) {
        console.error("Teams load error:", error);
        teamsDiv.innerHTML = `<div style="color: #b91c1c; background: #fee2e2; padding: 15px; border-radius: 8px;">❌ Failed to load teams: ${error.message}</div>`;
    }
}

loadTeams();