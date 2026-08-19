import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
                        .map(student => student.school?.trim())
                        .filter(Boolean)
                )
            ];

            const totalSchools = schools.length;

            document.getElementById("totalTeams").textContent = totalTeams;
            document.getElementById("arrivedTeams").textContent = arrivedTeams;
            document.getElementById("pendingTeams").textContent = pendingTeams;
            document.getElementById("totalStudents").textContent = totalStudents;
            document.getElementById("totalSchools").textContent = totalSchools;

            console.log({ totalTeams, arrivedTeams, pendingTeams, totalStudents, totalSchools });
        }, (error) => {
            console.error("Dashboard realtime error:", error);
        });

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

loadDashboard();