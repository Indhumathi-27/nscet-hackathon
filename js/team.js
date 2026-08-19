import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const teamNo =
    localStorage.getItem("teamNo");


const teamNoElement =
    document.getElementById("teamNo");

const schoolElement =
    document.getElementById("school");

const projectElement =
    document.getElementById("project");

const membersElement =
    document.getElementById("members");


let members = [];


async function loadTeam() {

    const snapshot = await getDocs(
        collection(db, "students")
    );


    snapshot.forEach((document) => {

        const student = document.data();

        if (student.teamNo === teamNo) {

            members.push({

                id: document.id,

                ...student

            });

        }

    });


    if (members.length === 0) {

        membersElement.innerHTML =
            "No members found.";

        return;
    }


    teamNoElement.textContent =
        "Team No: " + teamNo;


    schoolElement.textContent =
        members[0].school || "N/A";


    projectElement.textContent =
        members[0].projectTitle || "N/A";


    membersElement.innerHTML = "";


    members.forEach((student, index) => {

        const div =
            document.createElement("div");

        div.className = "member";


        div.innerHTML = `

            <span>
                ${index + 1}.
                ${student.studentName}
            </span>

            <label>

                <input
                    type="checkbox"
                    ${student.arrived ? "checked" : ""}
                    data-id="${student.id}"
                >

                Arrived

            </label>

        `;


        const checkbox =
            div.querySelector("input");


        checkbox.addEventListener(
            "change",
            async () => {

                await updateDoc(

                    doc(
                        db,
                        "students",
                        student.id
                    ),

                    {
                        arrived:
                            checkbox.checked
                    }

                );

            }
        );


        membersElement.appendChild(div);

    });

}


loadTeam();



window.generateReport = function () {

    let report = "";

    report +=
        "NSCET INNOVATE 24\n\n";

    report +=
        "Team No: " + teamNo + "\n";

    report +=
        "School: " +
        (members[0]?.school || "N/A") +
        "\n";

    report +=
        "Project: " +
        (members[0]?.projectTitle || "N/A") +
        "\n\n";

    report += "TEAM MEMBERS\n";

    report += "----------------------\n";


    members.forEach((student, index) => {

        report +=
            `${index + 1}. ${student.studentName} - ` +
            `${student.arrived ? "Arrived" : "Not Arrived"}\n`;

    });


    const newWindow =
        window.open("", "_blank");


    newWindow.document.write(`

        <html>

        <head>

            <title>Team Report</title>

        </head>

        <body>

            <pre>${report}</pre>

            <button onclick="window.print()">
                Print / Save PDF
            </button>

        </body>

        </html>

    `);

};