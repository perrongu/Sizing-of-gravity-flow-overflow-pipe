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

            pipeTypeSelect.innerHTML = '<option value="" disabled selected>Sélectionnez un type de tuyauterie</option>';
            const pipeTypes = Object.keys(data);
            pipeTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
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
        })
        .catch(error => console.error('Error loading diameters:', error));
});

// Fonction pour calculer le diamètre
document.getElementById("inputForm").addEventListener("submit", event => {
    event.preventDefault();
    calculerDiametre();
});

function calculerDiametre() {
    // Récupérer le débit volumique maximal de l'utilisateur
    const Q_max_input = document.getElementById("Q_max").value;
    const pipeType = document.getElementById("pipeType").value;

    if (!Q_max_input || isNaN(Q_max_input) || parseFloat(Q_max_input) <= 0) {
        alert("Veuillez entrer un débit volumique maximal valide.");
        return;
    }
    if (!pipeType) {
        alert("Veuillez sélectionner un type de tuyauterie.");
        return;
    }

    const Q_max = parseFloat(Q_max_input) / 3600;
    const J_t = 0.3;
    const g = 9.81;

    // Calcul du diamètre d
    const d = Math.pow((4 * Q_max) / (Math.PI * J_t * Math.sqrt(g)), 2 / 5);
    const d_mm = d * 1000;

    // Vérifier si les données des diamètres sont disponibles
    if (!window.diameters_data || !window.diameters_data[pipeType]) {
        alert("Les données des diamètres ne sont pas disponibles.");
        return;
    }

    const diameters = window.diameters_data[pipeType];
    if (!diameters || !Array.isArray(diameters)) {
        alert("Les données des diamètres ne sont pas disponibles.");
        return;
    }

    // Trouver le plus petit diamètre standard supérieur au diamètre calculé
    let selected_diameter = null;
    for (const diameter of diameters) {
        if (diameter.ID_mm >= d_mm) {
            selected_diameter = `DN: ${diameter.DN}, NPS: ${diameter.NPS}, ID: ${diameter.ID_mm} mm`;
            break;
        }
    }

    // Affichage du résultat
    document.getElementById("result").textContent = selected_diameter || "Aucun diamètre approprié trouvé";
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
