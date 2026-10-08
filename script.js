// Wait until the HTML document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  
  // Get the "Commencer" button element by its ID
  const startButton = document.getElementById('start-btn');

 

});


// importer page
const API_URL = "http://localhost:8000/api";

// DOM Elements
const tabCsv = document.getElementById("tab-csv");
const tabFasta = document.getElementById("tab-fasta");
const sectionCsv = document.getElementById("section-csv");
const sectionFasta = document.getElementById("section-fasta");
const btnAnalyze = document.getElementById("btn-analyze");
const csvFileInput = document.getElementById("csv-file-input");
const fastaFileInput = document.getElementById("fasta-file-input");
const loader = document.getElementById("loader");
const loaderStatus = document.getElementById("loader-status");
const resultsContainer = document.getElementById("results-container");
const resultsBody = document.getElementById("results-body");
const btnDownload = document.getElementById("btn-download");

let activeMode = "csv";
let lastAnalysisData = [];

// Tab Toggle Handlers
tabCsv.addEventListener("click", () => {
    activeMode = "csv";
    tabCsv.classList.add("active");
    tabFasta.classList.remove("active");
    sectionCsv.classList.remove("hidden");
    sectionFasta.classList.add("hidden");
});

tabFasta.addEventListener("click", () => {
    activeMode = "fasta";
    tabFasta.classList.add("active");
    tabCsv.classList.remove("active");
    sectionFasta.classList.remove("hidden");
    sectionCsv.classList.add("hidden");
});

// Run Analysis
btnAnalyze.addEventListener("click", async () => {
    const file = activeMode === "csv" ? csvFileInput.files[0] : fastaFileInput.files[0];
    
    if (!file) {
        alert("Veuillez sélectionner un fichier d'abord.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = activeMode === "csv" ? `${API_URL}/predict-matrix` : `${API_URL}/process-fasta`;

    // Show Loader
    loader.classList.remove("hidden");
    resultsContainer.classList.add("hidden");
    loaderStatus.innerText = activeMode === "fasta" 
        ? "Annotation de votre génome avec Prokka... (~3-5 min)" 
        : "Analyse des données en cours...";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Erreur lors du traitement");
        }

        const resData = await response.json();
        lastAnalysisData = resData.data;
        renderResults(lastAnalysisData);

    } catch (err) {
        alert(`❌ Erreur: ${err.message}`);
    } finally {
        loader.classList.add("hidden");
    }
});

// Render Results Data
function renderResults(data) {
    resultsBody.innerHTML = "";

    const samples = [...new Set(data.map(d => d.sample))];
    const resistant = data.filter(d => d.verdict.includes("🔴")).length;
    const sensible = data.filter(d => d.verdict.includes("🟢")).length;

    document.getElementById("m-samples").innerText = samples.length;
    document.getElementById("m-total").innerText = data.length;
    document.getElementById("m-resistant").innerText = resistant;
    document.getElementById("m-sensible").innerText = sensible;

    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.sample}</td>
            <td><strong>${row.code}</strong></td>
            <td>${row.name}</td>
            <td>${row.probability}%</td>
            <td>${row.verdict}</td>
        `;
        resultsBody.appendChild(tr);
    });

    resultsContainer.classList.remove("hidden");
}

// Download CSV Results
btnDownload.addEventListener("click", () => {
    if (!lastAnalysisData.length) return;

    let csvContent = "data:text/csv;charset=utf-8,Échantillon,Code,Nom complet,Probabilité (%),Verdict\n";
    lastAnalysisData.forEach(row => {
        csvContent += `${row.sample},${row.code},${row.name},${row.probability},${row.verdict}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `resultats_amr_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});