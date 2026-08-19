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

        const teamNames = [

            ...new Set(

                students

                    .map(
                        student =>
                            student.teamName
                    )

                    .filter(
                        team => team
                    )

            )

        ];


        const totalTeams =
            teamNames.length;


        // =================================
        // ARRIVED TEAMS
        // =================================

        let arrivedTeams = 0;


        teamNames.forEach(
            (teamName) => {


                const members =
                    students.filter(

                        student =>
                            student.teamName ===
                            teamName

                    );


                const allArrived =
                    members.length > 0 &&
                    members.every(

                        student =>
                            student.verified === true

                    );


                if (allArrived) {

                    arrivedTeams++;

                }

            }
        );


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