import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const fileInput = document.getElementById("excelFile");
const dropArea = document.getElementById("dropArea");
const fileDetails = document.getElementById("fileDetails");
const importBtn = document.getElementById("importBtn");
const statusDiv = document.getElementById("status");
const previewSection = document.getElementById("previewSection");
const previewTable = document.getElementById("previewTable");
const progressWrapper = document.getElementById("progressWrapper");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");

let parsedData = [];

function setStatus(message, type = "info") {
    if (!statusDiv) return;
    statusDiv.innerHTML = `<div class="status-banner status-${type}">${message}</div>`;
}

// Flexible case-insensitive column header search
function getVal(row, possibleKeys) {
    if (!row || typeof row !== "object") return "";
    const keys = Object.keys(row);
    
    for (const target of possibleKeys) {
        const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const key of keys) {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanKey === cleanTarget) {
                const val = row[key];
                return val !== undefined && val !== null ? String(val).trim() : "";
            }
        }
    }
    return "";
}

// Drag & Drop handlers
if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });
}

fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
    }
});

async function handleFileSelect(file) {
    if (!file) return;
    fileDetails.textContent = `Selected File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    
    try {
        setStatus("Reading spreadsheet preview...", "info");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        // Pick sheet
        const sheetName = workbook.Sheets["Participants"] ? "Participants" : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            setStatus("No valid data sheet found in Excel file.", "error");
            return;
        }

        parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (parsedData.length === 0) {
            setStatus("Excel sheet is empty.", "error");
            return;
        }

        setStatus(`Preview loaded: ${parsedData.length} records found in sheet "${sheetName}". Ready to upload!`, "success");
        renderPreview(parsedData);

    } catch (err) {
        console.error("Preview error:", err);
        setStatus(`Error reading Excel file: ${err.message}`, "error");
    }
}

function renderPreview(rows) {
    if (!previewTable || rows.length === 0) return;
    previewSection.style.display = "block";

    const thead = previewTable.querySelector("thead");
    const tbody = previewTable.querySelector("tbody");
    
    thead.innerHTML = `
        <tr>
            <th>#</th>
            <th>Team ID (ID)</th>
            <th>Student Name</th>
            <th>School Name</th>
            <th>Project Name</th>
            <th>Mentor</th>
        </tr>
    `;

    let currentTeam = "";
    let currentSchool = "";
    let currentProject = "";
    let currentMentor = "";

    const previewRows = rows.slice(0, 8).map((row, idx) => {
        const rawID = getVal(row, ["ID", "TEAM ID", "T", "TEAM NAME", "Team Name", "Form", "Team"]);
        const rawSchool = getVal(row, ["SCHOOL NAME", "SCHOOL NAM", "School", "School Name"]);
        const rawProject = getVal(row, ["PROJECT NAME", "PROJECT NAM", "Project", "Project Title"]);
        const rawMentor = getVal(row, ["MENTOR", "Mentor", "Mentor Name"]);
        const studentName = getVal(row, ["STUDENT NAME", "Student Name", "Student", "Name"]);

        if (rawID && rawID !== "N/A") currentTeam = rawID;
        if (rawSchool && rawSchool !== "N/A") currentSchool = rawSchool;
        if (rawProject && rawProject !== "N/A") currentProject = rawProject;
        if (rawMentor && rawMentor !== "N/A") currentMentor = rawMentor;

        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHTML(currentTeam || "NSCET Team")}</strong></td>
                <td>${escapeHTML(studentName || "N/A")}</td>
                <td>${escapeHTML(rawSchool || currentSchool || "N/A")}</td>
                <td>${escapeHTML(rawProject || currentProject || "N/A")}</td>
                <td>${escapeHTML(rawMentor || currentMentor || "N/A")}</td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = previewRows;
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

importBtn?.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file && parsedData.length === 0) {
        setStatus("Please select or drop an Excel file first.", "error");
        return;
    }

    try {
        importBtn.disabled = true;
        progressWrapper.style.display = "block";
        setStatus("Uploading students to Firebase...", "info");

        if (parsedData.length === 0) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.Sheets["Participants"] ? "Participants" : workbook.SheetNames[0];
            parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
        }

        let currentTeam = "";
        let currentSchool = "";
        let currentProject = "";
        let currentMentor = "";
        let uploadedCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];

            const studentName = getVal(row, ["STUDENT NAME", "Student Name", "Student", "Name", "Participant Name", "Member Name"]);
            
            const rawID = getVal(row, ["ID", "TEAM ID", "T", "TEAM NAME", "Team Name", "Form", "Team", "TeamNo"]);
            const rawSchool = getVal(row, ["SCHOOL NAME", "SCHOOL NAM", "School", "School Name", "Institution"]);
            const rawProject = getVal(row, ["PROJECT NAME", "PROJECT NAM", "Project", "Project Title", "Title"]);
            const rawMentor = getVal(row, ["MENTOR", "Mentor", "Mentor Name", "Teacher", "Guide"]);
            const serialNo = getVal(row, ["S. NO", "S.NO", "S NO", "NO OF MEMBERS"]);

            // Update current team ID context whenever a new team block starts
            if (rawID && rawID !== "N/A") {
                currentTeam = rawID;
            }
            if (rawSchool && rawSchool !== "N/A") {
                currentSchool = rawSchool;
            }
            if (rawProject && rawProject !== "N/A") {
                currentProject = rawProject;
            }
            if (rawMentor && rawMentor !== "N/A") {
                currentMentor = rawMentor;
            }

            // Skip empty rows without student name
            if (!studentName) {
                continue;
            }

            const finalTeam = currentTeam || (currentSchool ? `School: ${currentSchool}` : "NSCET Team");
            const finalSchool = rawSchool || currentSchool || "N/A";
            const finalProject = rawProject || currentProject || "N/A";
            const finalMentor = rawMentor || currentMentor || "N/A";

            // Clean document ID path safe for Firestore
            const safeTeam = finalTeam.replace(/[\/\s.#$\[\]]/g, "_");
            const safeStudent = studentName.replace(/[\/\s.#$\[\]]/g, "_");
            const studentId = `${safeTeam}_${safeStudent}_${i + 1}`;

            const studentData = {
                studentId: studentId,
                teamName: finalTeam,
                teamNo: finalTeam,
                school: finalSchool,
                projectTitle: finalProject,
                mentor: finalMentor,
                studentName: studentName,
                participantNo: `P${uploadedCount + 1}`,
                classDivision: "",
                studentPhone: "",
                verified: false,
                arrived: false,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, "students", studentId), studentData);

            uploadedCount++;
            const percent = Math.round((uploadedCount / parsedData.length) * 100);
            progressBar.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
            progressText.textContent = `Uploaded ${uploadedCount} of ${parsedData.length} records...`;
        }

        setStatus(`
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center; padding: 8px;">
                <div style="font-size: 15px; font-weight: 800; color: #15803d;">Successfully imported ${uploadedCount} student records into your database!</div>
                <a href="index.html" class="save-team-btn" style="text-decoration: none; padding: 11px 22px; display: inline-flex; align-items: center; gap: 8px; width: auto; font-size: 14px;">
                    View Imported Data on Main Desk →
                </a>
            </div>
        `, "success");
        importBtn.disabled = false;

    } catch (error) {
        console.error("Upload error:", error);
        setStatus(`Import Error: ${error.message}`, "error");
        importBtn.disabled = false;
    }
});