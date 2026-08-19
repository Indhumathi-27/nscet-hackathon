import { db } from "./firebase.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const fileInput = document.getElementById("excelFile");
const importBtn = document.getElementById("importBtn");
const status = document.getElementById("status");


importBtn.addEventListener("click", async () => {

    const file = fileInput.files[0];

    // Check whether an Excel file is selected
    if (!file) {
        status.innerText = "Please select an Excel file.";
        return;
    }

    try {

        status.innerText = "Reading Excel file...";

        // Read the Excel file
        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data);

        // Get the Participants sheet
        const worksheet = workbook.Sheets["Participants"];

        if (!worksheet) {
            status.innerText = "Participants sheet not found.";
            return;
        }

        // Convert Excel data into JavaScript objects
        const students = XLSX.utils.sheet_to_json(worksheet);

        console.log("Excel data:", students);

        status.innerText =
            `Found ${students.length} records. Uploading...`;


        let currentTeam = "";

        let uploadedCount = 0;


        // Process every student
        for (let i = 0; i < students.length; i++) {

            const student = students[i];


            // Get team/form name
            // If current row has a Form value, update currentTeam
            if (student["Form"]) {
                currentTeam = String(student["Form"]).trim();
            }


            // Get student name
            const studentName =
                String(student["Student Name"] || "").trim();


            // Skip completely empty rows
            if (!studentName) {
                continue;
            }


            // Participant number
            const participantNo =
                String(student["Participant No."] || "").trim();


            // Create unique student ID
            const studentId =
                `${currentTeam}_${participantNo || i + 1}`
                    .replace(/\s+/g, "_");


            // Student data for Firebase
            const studentData = {

                studentId: studentId,

                teamName: currentTeam,

                school:
                    String(student["School"] || "").trim(),

                address:
                    String(student["Address"] || "").trim(),

                pincode:
                    String(student["Pincode"] || "").trim(),

                headmasterPhone:
                    String(student["Headmaster Phone"] || "").trim(),

                projectTitle:
                    String(student["Project Title"] || "").trim(),

                participantNo:
                    participantNo,

                studentName:
                    studentName,

                classDivision:
                    String(student["Class / Division"] || "").trim(),

                studentPhone:
                    String(student["Student Phone"] || "").trim(),

                mentor:
                    String(student["Mentor"] || "").trim(),

                internetFacility:
                    String(student["Internet Facility"] || "").trim(),

                verified: false
            };


            // Save to Firestore
            await setDoc(
                doc(db, "students", studentId),
                studentData
            );


            uploadedCount++;

            status.innerText =
                `Uploaded ${uploadedCount} students...`;

            console.log(
                "Uploaded:",
                studentData
            );
        }


        status.innerText =
            `✅ Successfully uploaded ${uploadedCount} students!`;

    }
    catch (error) {

        console.error("Upload error:", error);

        status.innerText =
            `❌ Error: ${error.message}`;
    }

});