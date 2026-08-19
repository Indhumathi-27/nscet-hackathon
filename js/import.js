import { db } from "./firebase.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const fileInput = document.getElementById("excelFile");
const importBtn = document.getElementById("importBtn");
const status = document.getElementById("status");

function setStatus(message, type = "info") {
    if (!status) return;
    status.innerText = message;
    status.className = `status-${type}`;
}

importBtn.addEventListener("click", async () => {

    const file = fileInput.files[0];

    // Check whether an Excel file is selected
    if (!file) {
        setStatus("Please select an Excel file.", "error");
        return;
    }

    try {
        setStatus("Reading Excel file...", "info");
        importBtn.disabled = true;

        // Read the Excel file
        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data);

        // Get the Participants sheet (fallback to first sheet if 'Participants' not found)
        const sheetName = workbook.Sheets["Participants"] ? "Participants" : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            setStatus("No data sheet found in Excel file.", "error");
            importBtn.disabled = false;
            return;
        }

        // Convert Excel data into JavaScript objects
        const students = XLSX.utils.sheet_to_json(worksheet);

        console.log("Excel data:", students);

        setStatus(`Found ${students.length} records. Uploading to Firebase...`, "info");

        let currentTeam = "";
        let uploadedCount = 0;

        // Process every student
        for (let i = 0; i < students.length; i++) {
            const student = students[i];

            if (student["Form"]) {
                currentTeam = String(student["Form"]).trim();
            }

            const studentName = String(student["Student Name"] || "").trim();

            if (!studentName) {
                continue;
            }

            const participantNo = String(student["Participant No."] || "").trim();

            const studentId = `${currentTeam || "Team"}_${participantNo || i + 1}`.replace(/\s+/g, "_");

            const studentData = {
                studentId: studentId,
                teamName: currentTeam,
                teamNo: currentTeam,
                school: String(student["School"] || "").trim(),
                address: String(student["Address"] || "").trim(),
                pincode: String(student["Pincode"] || "").trim(),
                headmasterPhone: String(student["Headmaster Phone"] || "").trim(),
                projectTitle: String(student["Project Title"] || "").trim(),
                participantNo: participantNo,
                studentName: studentName,
                classDivision: String(student["Class / Division"] || "").trim(),
                studentPhone: String(student["Student Phone"] || "").trim(),
                mentor: String(student["Mentor"] || "").trim(),
                internetFacility: String(student["Internet Facility"] || "").trim(),
                verified: false,
                arrived: false
            };

            await setDoc(
                doc(db, "students", studentId),
                studentData
            );

            uploadedCount++;
            setStatus(`Uploaded ${uploadedCount} of ${students.length} students...`, "info");
        }

        setStatus(`✅ Successfully uploaded ${uploadedCount} students!`, "success");
        importBtn.disabled = false;

    } catch (error) {
        console.error("Upload error:", error);
        setStatus(`❌ Error: ${error.message}`, "error");
        importBtn.disabled = false;
    }
});