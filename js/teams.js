import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const teamsDiv = document.getElementById("teams");

async function loadTeams() {

    const snapshot = await getDocs(
        collection(db, "students")
    );

    const teams = {};

    snapshot.forEach((doc) => {

        const student = doc.data();

        const teamNo = student.teamNo;

        if (!teamNo) return;

        if (!teams[teamNo]) {
            teams[teamNo] = [];
        }

        teams[teamNo].push(student);
    });

    teamsDiv.innerHTML = "";

    Object.keys(teams).forEach((teamNo) => {

        const div = document.createElement("div");

        div.className = "team";

        div.innerHTML = `
            <h3>Team No: ${teamNo}</h3>
            <p>${teams[teamNo].length} Members</p>
        `;

        div.onclick = () => {

            localStorage.setItem(
                "teamNo",
                teamNo
            );

            window.location.href = "team.html";
        };

        teamsDiv.appendChild(div);
    });
}

loadTeams();