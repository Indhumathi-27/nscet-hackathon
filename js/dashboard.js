import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================
// LOAD DASHBOARD DATA
// =====================================

async function loadDashboard() {

    try {

        console.log(
            "Loading dashboard..."
        );


        const snapshot =
            await getDocs(
                collection(db, "students")
            );


        const students = [];


        snapshot.forEach((document) => {

            students.push(
                document.data()
            );

        });


        // =================================
        // TOTAL STUDENTS
        // =================================

        const totalStudents =
            students.length;


        // =================================
        // UNIQUE TEAMS
        // =================================

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


        // =================================
        // PENDING TEAMS
        // =================================

        const pendingTeams =
            totalTeams -
            arrivedTeams;


        // =================================
        // TOTAL SCHOOLS
        // =================================

        const schools = [

            ...new Set(

                students

                    .map(
                        student =>
                            student.school
                    )

                    .filter(
                        school => school
                    )

            )

        ];


        const totalSchools =
            schools.length;


        // =================================
        // DISPLAY
        // =================================

        document.getElementById(
            "totalTeams"
        ).textContent =
            totalTeams;


        document.getElementById(
            "arrivedTeams"
        ).textContent =
            arrivedTeams;


        document.getElementById(
            "pendingTeams"
        ).textContent =
            pendingTeams;


        document.getElementById(
            "totalStudents"
        ).textContent =
            totalStudents;


        document.getElementById(
            "totalSchools"
        ).textContent =
            totalSchools;


        console.log({
            totalTeams,
            arrivedTeams,
            pendingTeams,
            totalStudents,
            totalSchools
        });


    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// =====================================
// START
// =====================================

loadDashboard();