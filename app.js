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

            // Générer diameterTableBody au chargement initial
            const diameterTableBody = document.getElementById('diameterTableBody');
            const initialDiameters = afficherDiametresStandards('Steel_SCH40');
            initialDiameters.forEach(item => {
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

            // Ajouter un écouteur d'événement pour les changements de type de tuyauterie
            pipeTypeSelect.addEventListener('change', (event) => {
                const selectedType = event.target.value;
                mettreAJourTitreDiametres(selectedType);
                
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

                // Recalculer le diamètre et mettre à jour le graphique après le changement de type
                calculerDiametre();
                mettreAJourGraphique();
            });

            // Générer et afficher les données initiales du graphique
            genererDonneesGraphique();
            calculerDiametre();
            // Supprimer ou commenter l'appel à afficherGraphique si non défini
            // afficherGraphique();
            mettreAJourGraphique(); // Afficher le point mis en évidence initial
        })
        .catch(error => console.error('Erreur lors du chargement des diamètres :', error));

    // Ajouter l'écouteur pour le bouton de bascule
    const toggleButton = document.getElementById("toggleTable");
    const diameterTable = document.getElementById("diameterTable");

    toggleButton.addEventListener("click", () => {
        diameterTable.classList.toggle("collapsed");
        if (diameterTable.classList.contains("collapsed")) {
            toggleButton.textContent = "Afficher les diamètres standards";
        } else {
            toggleButton.textContent = "Masquer les diamètres standards";
        }
    });

    // Initialiser la valeur de Q_max à 50
    const QmaxInput = document.getElementById("Q_max");
    QmaxInput.value = 50;
    document.getElementById("Q_max_input").value = 50;
    document.getElementById("Q_max_value").textContent = 50;

    // Appeler la fonction lors du chargement initial avec le type par défaut
    mettreAJourTitreDiametres('Steel_SCH40');
    calculerDiametre();
});

/* ===========================
   Gestion des événements du formulaire
   =========================== */

// Empêcher le comportement par défaut du formulaire et mettre à jour le graphique lors de la soumission
document.getElementById("inputForm").addEventListener("submit", event => {
    event.preventDefault();
    calculerDiametre();
    mettreAJourGraphique();
});

// Mettre à jour le graphique lors de l'entrée de Q_max via le slider
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

/* ===========================
   Fonctions de mise à jour des valeurs
   =========================== */

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

/* ===========================
   Variables globales
   =========================== */

let selectedID_mm = null; // Variable pour stocker l'ID_mm sélectionné
let selectedDN = null; // Nouvelle variable pour stocker le DN sélectionné

/* ===========================
   Fonctions de calcul
   =========================== */

/**
 * Calculer le diamètre en fonction du Q_max et du type de tuyauterie
 */
function calculerDiametre() {
    const Q_max_input = document.getElementById("Q_max").value;
    const pipeType = document.getElementById("pipeType").value;

    if (!isValidInput(Q_max_input)) {
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

    const d = calculerDiametreFormula(Q_max, J_t, g);
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

    let selected_diameter = trouverDiameterSupérieur(diameters, d_mm);
    document.getElementById("result").textContent = selected_diameter 
        ? `ID ${selected_diameter.ID_mm.toFixed(1)} mm | DN${selected_diameter.DN} | NPS ${selected_diameter.NPS}` 
        : "Aucun diamètre approprié trouvé";

    mettreAJourEquations(Q_max_input, Q_max, d, d_mm, selected_diameter);
    mettreEnEvidenceTable();
}

/**
 * Vérifier si l'entrée est valide
 * @param {string} input 
 * @returns {boolean}
 */
function isValidInput(input) {
    return input && !isNaN(input) && parseFloat(input) > 0;
}

/**
 * Calculer le diamètre à l'aide de la formule donnée
 * @param {number} Q_max 
 * @param {number} J_t 
 * @param {number} g 
 * @returns {number}
 */
function calculerDiametreFormula(Q_max, J_t, g) {
    return Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 0.4);
}

/**
 * Trouver le diamètre standard supérieur au diamètre calculé
 * @param {Array} diameters 
 * @param {number} d_mm 
 * @returns {Object|null}
 */
function trouverDiameterSupérieur(diameters, d_mm) {
    selectedID_mm = null;
    selectedDN = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm >= d_mm) {
            selectedID_mm = diameter.ID_mm;
            selectedDN = diameter.DN;
            return diameter;
        }
    }
    return null;
}

/* ===========================
   Mise à jour de la table
   =========================== */

/**
 * Mettre à jour la ligne sélectionnée dans la table
 */
function mettreEnEvidenceTable() {
    const diameterTableBody = document.getElementById('diameterTableBody');
    const rows = diameterTableBody.getElementsByTagName('tr');

    // Supprimer toutes les mises en évidence précédentes
    Array.from(rows).forEach(row => {
        row.classList.remove('highlighted');
    });

    // Ajouter la mise en évidence à la ligne correspondante
    Array.from(rows).forEach(row => {
        const dnCell = row.cells[0]; // La cellule DN est la première cellule
        if (dnCell) {
            const dnValue = parseFloat(dnCell.textContent);
            if (dnValue === selectedDN) {
                row.classList.add('highlighted');
            }
        }
    });
}

/* ===========================
   Génération des données du graphique
   =========================== */

/**
 * Générer les données pour le graphique
 */
function genererDonneesGraphique() {
    const J_t = 0.3;
    const g = 9.81;

    window.dataPoints = [];
    for (let Q = 0; Q <= 500; Q += 1) {
        const Q_m3s = Q / 3600;
        const d_temp = calculerDiametreFormula(Q_m3s, J_t, g) * 1000;
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

/* ===========================
   Mise à jour du graphique
   =========================== */

/**
 * Mettre à jour le graphique avec les annotations basées sur Q_max et d
 */
function mettreAJourGraphique() {
    const Q_max_input = document.getElementById("Q_max").value;
    const pipeType = document.getElementById("pipeType").value;

    if (!isValidInput(Q_max_input) || !pipeType) {
        return;
    }

    const Q_max = parseFloat(Q_max_input) / 3600;
    const J_t = 0.3;
    const g = 9.81;

    // Calculer le diamètre correspondant
    const d = calculerDiametreFormula(Q_max, J_t, g);
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
    let nextDiameter = trouverDiameterSupérieur(diameters, d_mm);

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

/* ===========================
   Affichage des diamètres standards
   =========================== */

/**
 * Afficher les diamètres standards pour le type de tuyauterie sélectionné
 * @param {string} pipeType 
 * @returns {Array}
 */
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

/* ===========================
   Mise à jour des titres et équations
   =========================== */

/**
 * Mettre à jour le titre des diamètres standards
 * @param {string} pipeType 
 */
function mettreAJourTitreDiametres(pipeType) {
    const titleElement = document.getElementById("diameterTitle");
    titleElement.textContent = `Diamètres intérieurs standards pour la spécification ${pipeType}`;
}

/**
 * Mettre à jour les équations avec les nouvelles valeurs
 * @param {number} Q_max_input 
 * @param {number} Q_max 
 * @param {number} d 
 * @param {number} d_mm 
 * @param {Object} selected_diameter 
 */
function mettreAJourEquations(Q_max_input, Q_max, d, d_mm, selected_diameter) {
    // ...existing code updating the equations...
    
    // Passer Q_max_input à la fonction générerDemarchePasAPas
    genererDemarchePasAPas(Q_max_input, Q_max, d, d_mm);
    
    // Recharger MathJax pour le rendu des équations
    if (window.MathJax) {
        MathJax.typeset();
    }
}

/**
 * Générer la démarche pas à pas des calculs
 * @param {number} Q_max_input 
 * @param {number} Q_max 
 * @param {number} d 
 * @param {number} d_mm 
 */
function genererDemarchePasAPas(Q_max_input, Q_max, d, d_mm) {
    const stepContainer = document.getElementById('stepByStep');
    stepContainer.innerHTML = `
        <h3>On connait les valeurs suivantes</h3>
        <ul>
            <li>Le débit volumique maximal : \\( Q_{max} = \\frac{${Q_max_input} \\, \\text{m}³}{\\text{h}} \\)</li>
            <li>La perte de charge spécifique : \\( J_t = 0.3 \\)</li>
            <li>L'accélération gravitationnelle : \\( g = 9.81 \\, \\text{m/s}² \\)</li>
        </ul>
        <h3>Calcul du diamètre minimum requis</h3>
        <ol>
            <li>
                Calcul du débit volumique en m³/s :
                $$ Q = \\frac{${Q_max_input} \\, \\text{m}³/\\text{h}}{3600} = ${ (Q_max_input / 3600).toFixed(4) } \\, \\text{m}³/\\text{s} $$
            </li>
            <li>
                Application de la formule pour le diamètre :
                $$ d = \\left( \\frac{4Q}{\\pi J_t \\sqrt{g}} \\right)^{0.4} = \\left( \\frac{4 \\times ${ Q_max.toFixed(4) } }{\\pi \\times 0.3 \\times \\sqrt{9.81}} \\right)^{0.4} \\approx ${ d.toFixed(4) } \\, \\text{m} $$
            </li>
            <li>
                Conversion en millimètres :
                $$ d_{mm} = ${ d.toFixed(4) } \\, \\text{m} \\times 1000 = ${ d_mm.toFixed(2) } \\, \\text{mm} $$
            </li>
        </ol>
        <h3>Identification du diamètre standard supérieur</h3>
        <p>
            Après avoir calculé le diamètre minimum requis, nous comparons ce résultat avec les diamètres standards disponibles. Le plus petit diamètre standard égal ou supérieur est sélectionné.
        </p>
    `;
}
