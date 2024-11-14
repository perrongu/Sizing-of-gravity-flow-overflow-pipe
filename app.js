// Attendre le chargement complet du DOM avant d'exécuter le script
document.addEventListener("DOMContentLoaded", () => {
    // Charger les données des diamètres à partir du fichier JSON
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
                throw new Error('Élément avec l\'id "pipeType" introuvable dans le DOM');
            }

            // Initialiser les options du sélecteur de type de tuyauterie
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

            // Ajouter un écouteur d'événement pour les changements de type de tuyauterie
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

            // Générer et afficher les données initiales du graphique
            genererDonneesGraphique();
            calculerDiametre();
            // Supprimer ou commenter l'appel à afficherGraphique si non défini
            // afficherGraphique();
            mettreAJourGraphique(); // Afficher le point mis en évidence initial
        })
        .catch(error => console.error('Erreur lors du chargement des diamètres :', error));
});

// Empêcher le comportement par défaut du formulaire et mettre à jour le graphique lors de la soumission
document.getElementById("inputForm").addEventListener("submit", event => {
    event.preventDefault();
    calculerDiametre();
    mettreAJourGraphique();
});

// Mettre à jour le graphique lors de l'entrée de Q_max
document.getElementById("Q_max").addEventListener("input", () => {
    if (document.getElementById("pipeType").value) {
        calculerDiametre();
        mettreAJourGraphique();
    } else {
        document.getElementById("result").textContent = "Veuillez sélectionner un type de tuyauterie.";
    }
});

// Mettre à jour le graphique et l'échelle lors du changement de type de tuyauterie
document.getElementById("pipeType").addEventListener("change", (event) => {
    if (document.getElementById("Q_max").value) {
        calculerDiametre();
        mettreAJourGraphique();
    } else {
        document.getElementById("result").textContent = "Veuillez entrer un débit volumique maximal valide.";
    }
    mettreAJourEchelleY(event.target.value);
});

// Synchroniser le slider et le champ de saisie de Q_max
document.getElementById("Q_max_input").addEventListener("input", (event) => {
    const value = event.target.value;
    document.getElementById("Q_max").value = value;
    document.getElementById("Q_max_value").textContent = value;
    calculerDiametre();
    mettreAJourGraphique();
});

document.getElementById("Q_max").addEventListener("input", (event) => {
    const value = event.target.value;
    document.getElementById("Q_max_input").value = value;
    document.getElementById("Q_max_value").textContent = value;
    calculerDiametre();
    mettreAJourGraphique();
});

// Mettre à jour l'affichage de Q_max depuis le slider
function updateQmaxValue(value) {
    document.getElementById("Q_max_value").textContent = value;
    document.getElementById("Q_max_input").value = value;
    calculerDiametre();
    mettreAJourGraphique();
}

// Mettre à jour la valeur de Q_max depuis le champ de saisie
function updateQmaxRange(value) {
    document.getElementById("Q_max").value = value;
    document.getElementById("Q_max_value").textContent = value;
    calculerDiametre();
    mettreAJourGraphique();
}

// Calculer le diamètre en fonction du Q_max et du type de tuyauterie
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

    // Calcul du diamètre basé sur la formule donnée
    const d = Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 0.4);
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

    // Trouver le diamètre standard le plus proche supérieur ou égal au diamètre calculé
    let selected_diameter = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm >= d_mm) {
            selected_diameter = `ID ${diameter.ID_mm.toFixed(1)} mm | DN${diameter.DN} | NPS ${diameter.NPS}`;
            break;
        }
    }

    document.getElementById("result").textContent = selected_diameter || "Aucun diamètre approprié trouvé";
}

// Générer les données pour le graphique
function genererDonneesGraphique() {
    const J_t = 0.3;
    const g = 9.81;

    window.dataPoints = [];
    for (let Q = 0; Q <= 500; Q += 1) {
        const Q_m3s = Q / 3600;
        const d_temp = Math.pow((4 * Q_m3s) / (Math.PI * J_t * Math.sqrt(g)), 0.4) * 1000;
        window.dataPoints.push({ x: Q, y: d_temp });
    }

    // Créer le graphique avec Chart.js
    const ctx = document.getElementById('chart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'ID vs Qmax',
                data: window.dataPoints,
                borderColor: 'rgba(34, 183, 197, 1)',
                backgroundColor: 'rgba(34, 183, 197, 0.2)',
                fill: false,
                pointRadius: 0,
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
                    },
                    min: 0,
                    max: 500
                },
                y: {
                    title: {
                        display: true,
                        text: 'd (ID) mm'
                    },
                    grid: {
                        display: false
                    },
                    min: 0,
                    max: 900
                }
            },
            plugins: {
                annotation: {
                    annotations: {} // Initialement vide, sera rempli par mettreAJourGraphique
                }
            }
        },
    });
}

// Mettre à jour le graphique avec les annotations basées sur Q_max et d
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

    // Calculer le diamètre correspondant
    const d = Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 0.4);
    const d_mm = d * 1000;

    // Initialiser les annotations avec le point et les lignes correspondantes
    const annotations = {
        point: {
            type: 'point',
            xValue: parseFloat(Q_max_input),
            yValue: d_mm,
            backgroundColor: 'rgba(34, 183, 197, 1)',
            radius: 5,
            borderColor: 'rgba(34, 183, 197, 1)',
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
            borderColor: 'rgba(34, 183, 197, 1)',
            borderWidth: 3,
            borderDash: [6, 6]
        },
        yLine: {
            type: 'line',
            xMin: 0,
            xMax: parseFloat(Q_max_input),
            yMin: d_mm,
            yMax: d_mm,
            borderColor: 'rgba(34, 183, 197, 1)', // Changé de 'red' au turquoise
            borderWidth: 3,
            borderDash: [6, 6]
        }
    };

    // Ajouter des lignes noires pour chaque ID_mm existant du type de tuyauterie sélectionné
    const diameters = window.diameters_data[pipeType];
    diameters.forEach((diameter, index) => {
        annotations[`idLine${index}`] = {
            type: 'line',
            borderColor: 'black',
            borderWidth: 1,
            borderDash: [2, 2],
            xMin: 0,
            xMax: 500,
            yMin: diameter.ID_mm,
            yMax: diameter.ID_mm,
            label: {
                content: `${diameter.ID_mm.toFixed(1)} mm | DN${diameter.DN} | NPS ${diameter.NPS}`,
                enabled: true,
                position: 'end'
            }
        };
    });

    // Trouver le prochain diamètre standard supérieur
    let nextDiameter = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm > d_mm) {
            nextDiameter = diameter;
            break;
        }
    }

    if (nextDiameter) {
        annotations.nextStandardPoint = {
            type: 'point',
            xValue: parseFloat(Q_max_input),
            yValue: nextDiameter.ID_mm,
            backgroundColor: 'green',
            radius: 5,
            borderColor: 'green',
            borderWidth: 2,
            label: {
                content: `Prochain ID standard: ${nextDiameter.ID_mm} mm`,
                enabled: true,
                position: 'top'
            }
        };
        // Ajouter la ligne horizontale verte
        annotations.nextStandardLine = {
            type: 'line',
            xMin: parseFloat(Q_max_input),
            xMax: 500,
            yMin: nextDiameter.ID_mm,
            yMax: nextDiameter.ID_mm,
            borderColor: 'green',
            borderWidth: 3,
            label: {
                content: `${nextDiameter.ID_mm.toFixed(1)} mm | DN${nextDiameter.DN} | NPS ${nextDiameter.NPS}`,
                enabled: true,
                position: 'end',
                backgroundColor: 'green'
            }
        };
    }

    // Trouver le prochain diamètre standard inférieur
    let previousDiameter = null;
    for (let i = diameters.length - 1; i >= 0; i--) {
        if (diameters[i].ID_mm < d_mm) {
            previousDiameter = diameters[i];
            break;
        }
    }

    if (previousDiameter) {
        annotations.previousStandardPoint = {
            type: 'point',
            xValue: parseFloat(Q_max_input),
            yValue: previousDiameter.ID_mm,
            backgroundColor: 'red',
            radius: 5,
            borderColor: 'red',
            borderWidth: 2,
        };
        // Ajouter la ligne horizontale rouge
        annotations.previousStandardLine = {
            type: 'line',
            xMin: parseFloat(Q_max_input),
            xMax: 500,
            yMin: previousDiameter.ID_mm,
            yMax: previousDiameter.ID_mm,
            borderColor: 'red',
            borderWidth: 3,
        };
    }

    // Calculer les nouvelles limites pour les axes
    const newXMin = Math.max(parseFloat(Q_max_input) - 25, 0);
    const newXMax = Math.min(parseFloat(Q_max_input) + 25, 500);
    const newYMin = Math.max(d_mm - 100, 0);
    const newYMax = Math.min(d_mm + 100, 900);

    // Mettre à jour les options des axes
    window.myChart.options.scales.x.min = newXMin;
    window.myChart.options.scales.x.max = newXMax;
    window.myChart.options.scales.y.min = newYMin;
    window.myChart.options.scales.y.max = newYMax;

    // Mettre à jour les annotations du graphique
    window.myChart.options.plugins.annotation.annotations = annotations;

    // Mettre à jour le graphique
    window.myChart.update();
}

// Afficher les diamètres standards pour le type de tuyauterie sélectionné
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
