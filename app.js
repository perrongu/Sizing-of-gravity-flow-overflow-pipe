document.addEventListener("DOMContentLoaded", () => {
    fetch('diameters.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            window.diameters_data = data;

            const pipeTypeSelect = document.getElementById('pipeType');
            if (!pipeTypeSelect) {
                throw new Error('Element with id "pipeType" not found in the DOM');
            }

            pipeTypeSelect.innerHTML = '<option value="" disabled>Sélectionnez un type de tuyauterie</option>';
            const pipeTypes = Object.keys(data);
            pipeTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                if (type === 'Steel_SCH40') {
                    option.selected = true;
                }
                pipeTypeSelect.appendChild(option);
            });

            pipeTypeSelect.addEventListener('change', (event) => {
                const selectedType = event.target.value;
                const diameterTableBody = document.getElementById('diameterTableBody');
                diameterTableBody.innerHTML = ''; // Vider la table précédente

                const listItems = afficherDiametresStandards(selectedType);
                listItems.forEach(item => {
                    const row = document.createElement('tr');

                    const dnCell = document.createElement('td');
                    dnCell.textContent = item.DN;
                    row.appendChild(dnCell);

                    const npsCell = document.createElement('td');
                    npsCell.textContent = item.NPS;
                    row.appendChild(npsCell);

                    const idCell = document.createElement('td');
                    idCell.textContent = `${item.ID_mm} mm`;
                    row.appendChild(idCell);

                    diameterTableBody.appendChild(row);
                });
            });

            // Calculer les données du graphique une seule fois
            genererDonneesGraphique();
            // Déclencher les calculs et l'affichage du graphique avec les valeurs par défaut
            calculerDiametre();
            afficherGraphique();
            mettreAJourGraphique(); // Mise en évidence initiale
            const defaultPipeType = document.getElementById("pipeType").value;
            mettreAJourEchelleY(defaultPipeType);
        })
        .catch(error => console.error('Error loading diameters:', error));
});

document.getElementById("inputForm").addEventListener("submit", event => {
    event.preventDefault();
    calculerDiametre();
    mettreAJourGraphique();
});

document.getElementById("Q_max").addEventListener("input", () => {
    if (document.getElementById("pipeType").value) {
        calculerDiametre();
        mettreAJourGraphique();
    } else {
        document.getElementById("result").textContent = "Veuillez sélectionner un type de tuyauterie.";
    }
});

document.getElementById("pipeType").addEventListener("change", (event) => {
    if (document.getElementById("Q_max").value) {
        calculerDiametre();
        mettreAJourGraphique();
    } else {
        document.getElementById("result").textContent = "Veuillez entrer un débit volumique maximal valide.";
    }
    mettreAJourEchelleY(event.target.value);
});

document.getElementById("Q_max_input").addEventListener("input", (event) => {
    const value = event.target.value;
    document.getElementById("Q_max").value = value;
    document.getElementById("Q_max_value").textContent = value;
    calculerDiametre();
    mettreAJourGraphique();
});

function updateQmaxValue(value) {
    document.getElementById("Q_max_value").textContent = value;
    document.getElementById("Q_max_input").value = value;
    calculerDiametre();
    mettreAJourGraphique();
}

function updateQmaxRange(value) {
    document.getElementById("Q_max").value = value;
    document.getElementById("Q_max_value").textContent = value;
    calculerDiametre();
    mettreAJourGraphique();
}

function calculerDiametre() {
    const Q_max_input = document.getElementById("Q_max").value;
    const pipeType = document.getElementById("pipeType").value;

    if (!Q_max_input || isNaN(Q_max_input) || parseFloat(Q_max_input) <= 0) {
        document.getElementById("result").textContent = "Veuillez entrer un débit volumique maximal valide.";
        return;
    }
    if (!pipeType) {
        document.getElementById("result").textContent = "Veuillez sélectionner un type de tuyauterie.";
        return;
    }

    const Q_max = parseFloat(Q_max_input) / 3600;
    const J_t = 0.3;
    const g = 9.81;

    const d = Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 2 / 5);
    const d_mm = d * 1000;

    if (!window.diameters_data || !window.diameters_data[pipeType]) {
        document.getElementById("result").textContent = "Les données des diamètres ne sont pas disponibles.";
        return;
    }

    const diameters = window.diameters_data[pipeType];
    if (!diameters || !Array.isArray(diameters)) {
        document.getElementById("result").textContent = "Les données des diamètres ne sont pas disponibles.";
        return;
    }

    let selected_diameter = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm >= d_mm) {
            selected_diameter = `DN: ${diameter.DN}, NPS: ${diameter.NPS}, ID: ${diameter.ID_mm} mm`;
            break;
        }
    }

    document.getElementById("result").textContent = selected_diameter || "Aucun diamètre approprié trouvé";
}

function genererDonneesGraphique() {
    const J_t = 0.3;
    const g = 9.81;

    // Générer les données pour le graphique une seule fois
    window.dataPoints = [];
    for (let Q = 0; Q <= 500; Q += 5) {
        const Q_m3s = Q / 3600;
        const d_temp = Math.pow((4 * Q_m3s) / (Math.PI * J_t * Math.sqrt(g)), 0.4) * 1000;
        window.dataPoints.push({ x: Q, y: d_temp });
    }

    // Créer le graphique
    const ctx = document.getElementById('chart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'd (ID) vs Qmax',
                data: window.dataPoints,
                borderColor: 'rgba(34, 183, 197, 1)',
                backgroundColor: 'rgba(34, 183, 197, 0.2)',
                fill: false,
                pointRadius: 0, // Pas de points visibles
                pointHoverRadius: 0,
                showLine: true
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Qmax (m³/h)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'd (ID) mm'
                    },
                    grid: {
                        display: false // Enlever le quadrillage de l'axe Y
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: {}
                }
            }
        },
    });
}

function mettreAJourGraphique() {
    const Q_max_input = document.getElementById("Q_max").value;
    const pipeType = document.getElementById("pipeType").value;

    if (!Q_max_input || isNaN(Q_max_input) || parseFloat(Q_max_input) <= 0) {
        document.getElementById("highlightedPoint").textContent = "Veuillez entrer un débit volumique maximal valide.";
        return;
    }

    if (!pipeType) {
        document.getElementById("highlightedPoint").textContent = "Veuillez sélectionner un type de tuyauterie.";
        return;
    }

    const Q_max = parseFloat(Q_max_input) / 3600;
    const J_t = 0.3;
    const g = 9.81;

    const d = Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 0.4);
    const d_mm = d * 1000;

    // Mettre à jour l'échelle Y et obtenir les IDs adjacents
    const { lowerID, upperID, scaleUpdated } = mettreAJourEchelleY(pipeType, d_mm);

    // Mettre à jour les annotations du graphique uniquement si l'échelle a été mise à jour
    if (scaleUpdated) {
        window.myChart.options.plugins.annotation.annotations = {
            point: {
                type: 'point',
                xValue: parseFloat(Q_max_input),
                yValue: d_mm,
                backgroundColor: 'red',
                radius: 3,
                borderColor: 'red',
                borderWidth: 2,
                label: {
                    content: `Qmax: ${Q_max_input} m³/h, d: ${d_mm.toFixed(2)} mm`,
                    enabled: true,
                    position: 'top'
                }
            },
            xLine: {
                type: 'line',
                xMin: parseFloat(Q_max_input),
                xMax: parseFloat(Q_max_input),
                yMin: 0,
                yMax: d_mm,
                borderColor: 'red',
                borderWidth: 1,
                borderDash: [6, 6]
            },
            yLine: {
                type: 'line',
                xMin: 0,
                xMax: parseFloat(Q_max_input),
                yMin: d_mm,
                yMax: d_mm,
                borderColor: 'red',
                borderWidth: 1,
                borderDash: [6, 6]
            },
            // Ajout des lignes adjacentes
            ...(lowerID && {
                lineLower: {
                    type: 'line',
                    yMin: lowerID,
                    yMax: lowerID,
                    xMin: 0,
                    xMax: 500,
                    borderColor: 'rgba(0, 0, 0, 0.9)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: {
                        content: `${lowerID} mm`,
                        enabled: true,
                        position: 'start',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        color: '#000',
                        font: {
                            size: 10
                        },
                        yAdjust: -10
                    }
                }
            }),
            ...(upperID && {
                lineUpper: {
                    type: 'line',
                    yMin: upperID,
                    yMax: upperID,
                    xMin: 0,
                    xMax: 500,
                    borderColor: 'rgba(0, 0, 0, 0.9)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: {
                        content: `${upperID} mm`,
                        enabled: true,
                        position: 'start',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        color: '#000',
                        font: {
                            size: 10
                        },
                        yAdjust: -10
                    }
                }
            })
        };

        window.myChart.update();
    }

    // Afficher les valeurs en x et y du point mis en évidence
    document.getElementById("highlightedPoint").textContent = `Point mis en évidence - Qmax: ${Q_max_input} m³/h, d: ${d_mm.toFixed(2)} mm`;
}

function mettreAJourEchelleY(pipeType, d_mm) {
    if (!window.diameters_data || !window.diameters_data[pipeType]) {
        return { lowerID: null, upperID: null, scaleUpdated: false };
    }

    const diameters = window.diameters_data[pipeType];
    if (!diameters || !Array.isArray(diameters)) {
        return { lowerID: null, upperID: null, scaleUpdated: false };
    }

    // Find the adjacent ID values
    let lowerID = null;
    let upperID = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm >= d_mm) {
            upperID = diameter.ID_mm;
            break;
        }
        lowerID = diameter.ID_mm;
    }

    // Check if the current d_mm is within the existing interval
    const currentMin = window.myChart.options.scales.y.min;
    const currentMax = window.myChart.options.scales.y.max;
    const scaleUpdated = !(d_mm >= currentMin && d_mm <= currentMax);

    if (scaleUpdated) {
        // Update the Y scale of the chart
        window.myChart.options.scales.y = {
            type: 'linear',
            title: {
                display: true,
                text: 'd (ID) mm'
            },
            grid: {
                display: false // Enlever le quadrillage de l'axe Y
            },
            min: lowerID ? lowerID - 10 : 0,
            max: upperID ? upperID + 10 : d_mm + 10
        };

        // Remove previous horizontal lines except annotations for Qmax
        const existingLines = Object.keys(window.myChart.options.plugins.annotation.annotations).filter(key => key.startsWith('line'));
        existingLines.forEach(key => {
            delete window.myChart.options.plugins.annotation.annotations[key];
        });
    }

    return { lowerID, upperID, scaleUpdated };
}

function afficherDiametresStandards(pipeType) {
    if (!window.diameters_data || !window.diameters_data[pipeType]) {
        alert("Les données des diamètres ne sont pas disponibles.");
        return [];
    }

    const diameters = window.diameters_data[pipeType];
    if (!diameters || !Array.isArray(diameters)) {
        alert("Les données des diamètres ne sont pas disponibles.");
        return [];
    }

    return diameters;
}
