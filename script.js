let selectedMenuItems = [];
let registrations = [];
let condolences = [];
let donations = [];
// Variable pour stocker la dernière inscription de l'utilisateur sur ce navigateur
let lastUserRegistration = null;
// Variable globale pour l'URL de votre Apps Script (PLACEHOLDER)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbz3whgdTTkipblEW8tndSCBzSTdWdzTKGPMNxG3ovl_w_Sw7EpnivgCsqxW1SQgydhr/exec'; 

function sendDataToGoogleSheet(data, actionType) {
    const sheetData = {
        action_type: 'inscription', // IMPORTANT: ajouter ce paramètre
        action: actionType,
        nom: data.nom,
        telephone: data.telephone,
        nbPersonnes: data.nbPersonnes,
        arrivee: data.arrivee,
        depart: data.depart,
        menuChoix: data.menuChoix,
        message: data.message,
        timestamp: data.date
    };
    
    return fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(sheetData),
    })
    .then(() => true)
    .catch(error => {
        console.error('Erreur:', error);
        throw new Error('Échec de la communication avec le serveur.');
    });
}

// Charger les données au démarrage
window.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadCondolencesFromSheet(); // Charger depuis Sheets uniquement
    checkExistingRegistration();
    loadMenuFromSheet();
});

function loadData() {
    const savedRegistrations = localStorage.getItem('memorial_registrations');
    const savedDonations = localStorage.getItem('memorial_donations');
    const savedLastReg = localStorage.getItem('last_user_registration');

    if (savedRegistrations) registrations = JSON.parse(savedRegistrations);
    if (savedDonations) donations = JSON.parse(savedDonations);
    if (savedLastReg) lastUserRegistration = JSON.parse(savedLastReg);
}

function saveData() {
    localStorage.setItem('memorial_registrations', JSON.stringify(registrations));
    localStorage.setItem('memorial_donations', JSON.stringify(donations));
    
    if (lastUserRegistration) {
        localStorage.setItem('last_user_registration', JSON.stringify(lastUserRegistration));
    } else {
        localStorage.removeItem('last_user_registration');
    }
}

/**
 * Vérifie si une inscription existe localement et pré-remplit le formulaire.
 * Modifie le titre du formulaire pour indiquer qu'il s'agit d'une mise à jour.
 */
function checkExistingRegistration() {
    const formTitle = document.querySelector('#inscription h2');
    const submitButton = document.querySelector('#registrationForm button[type="submit"]');

    if (lastUserRegistration) {
        // Mettre à jour le titre
        if (formTitle) {
            formTitle.innerHTML = 'Modifier vos Informations';
        }
        
        // Pré-remplir le formulaire
        document.getElementById('nom').value = lastUserRegistration.nom || '';
        document.getElementById('telephone').value = lastUserRegistration.telephone || '';
        document.getElementById('nbPersonnes').value = lastUserRegistration.nbPersonnes || '';
        document.getElementById('arrivee').value = lastUserRegistration.arrivee || '';
        document.getElementById('depart').value = lastUserRegistration.depart || '';
        document.getElementById('message').value = lastUserRegistration.message || '';

        // Pré-sélectionner le menu (plus complexe)
        const selectedMenu = lastUserRegistration.menuChoix ? lastUserRegistration.menuChoix.split(', ') : [];
        
        document.querySelectorAll('.menu-item').forEach(itemElement => {
            const item = itemElement.dataset.item;
            if (selectedMenu.includes(item)) {
                itemElement.classList.add('selected');
            } else {
                itemElement.classList.remove('selected');
            }
        });
        
        // Mettre à jour les éléments de menu sélectionnés globalement
        selectedMenuItems = selectedMenu;

        // Mettre à jour le texte du bouton
        if (submitButton) {
            submitButton.textContent = 'Modifier vos Informations';
            submitButton.classList.add('btn-update'); // Vous pouvez ajouter un style CSS spécifique
        }
        
    } else {
        // Réinitialiser si aucune inscription trouvée
        if (formTitle) {
            formTitle.innerHTML = 'Confirmer ma Présence';
        }
        if (submitButton) {
            submitButton.textContent = 'Confirmer ma Présence';
            submitButton.classList.remove('btn-update');
        }
    }
}

function toggleMenuItem(element) {
    element.classList.toggle('selected');
    const item = element.dataset.item;
    
    if (element.classList.contains('selected')) {
        if (!selectedMenuItems.includes(item)) {
            selectedMenuItems.push(item);
        }
    } else {
        selectedMenuItems = selectedMenuItems.filter(i => i !== item);
    }
    
    document.getElementById('menu-choix').value = selectedMenuItems.join(', ');
}

// ... autres fonctions ...

function handleSubmit(event) {
    event.preventDefault();

    const nom = document.getElementById('nom').value;
    const telephone = document.getElementById('telephone').value;
    const nbPersonnes = document.getElementById('nbPersonnes').value;
    const arrivee = document.getElementById('arrivee').value;
    const depart = document.getElementById('depart').value;
    const menuChoix = selectedMenuItems.join(', '); // Utiliser les items sélectionnés
    const message = document.getElementById('message').value;

    if (!nom || !telephone) {
        alert('Veuillez remplir les champs obligatoires (nom et téléphone)');
        return;
    }

    // Déterminer s'il s'agit d'une mise à jour (en cherchant d'abord dans la liste globale, puis dans lastUserRegistration)
    let existingReg = registrations.find(r => r.nom === nom && r.telephone === telephone);
    
    // Si l'utilisateur n'a pas changé son Nom/Téléphone, on utilise l'ID de la dernière session
    if (!existingReg && lastUserRegistration && lastUserRegistration.nom === nom && lastUserRegistration.telephone === telephone) {
        existingReg = lastUserRegistration;
    }
    
    const actionType = existingReg ? 'Mise à jour' : 'Nouvelle inscription';

    const registration = {
        // Conserver l'ID s'il existe, sinon en créer un nouveau
        id: existingReg ? existingReg.id : Date.now(), 
        nom,
        telephone,
        nbPersonnes,
        arrivee,
        depart,
        menuChoix,
        message,
        date: new Date().toISOString(),
        action: actionType 
    };

    // 1. Mettre à jour la liste globale des inscriptions
    if (existingReg) {
        registrations = registrations.map(r => r.id === registration.id ? registration : r);
    } else {
        registrations.push(registration);
    }
    
    // 2. Mettre à jour l'inscription de l'utilisateur pour le pré-remplissage local
    lastUserRegistration = registration;
    
    // 3. Sauvegarder les deux dans le localStorage
    saveData(); 

    // 4. Envoi des données au backend (Google Sheets)
    sendDataToGoogleSheet(registration, actionType)
        .then(() => {
            const msgText = actionType === 'Mise à jour' 
                ? `✓ Votre inscription a été mise à jour avec succès !`
                : `✓ Votre inscription a été enregistrée avec succès !`;

            const confirmationMsg = document.getElementById('confirmationMsg');
            confirmationMsg.textContent = msgText;
            confirmationMsg.style.display = 'block';

            // Mise à jour immédiate de l'interface après une soumission réussie
            checkExistingRegistration(); 

            // Réinitialiser le message après 5 secondes
            setTimeout(() => {
                confirmationMsg.style.display = 'none';
            }, 5000);
        })
        .catch(error => {
            alert("Erreur lors de l'enregistrement ou de la mise à jour : " + error.message);
        });
}

function addCondolence(event) {
    event.preventDefault();
    
    const nom = document.getElementById('condoleance-nom').value;
    const message = document.getElementById('condoleance-message').value;
    
    if (!nom || !message) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    // Envoyer directement au Google Sheet (pas de localStorage)
    const formData = new URLSearchParams({
        action_type: 'condoleance',
        nom: nom,
        message: message
    });

    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
    .then(() => {
        alert('✓ Votre condoléance a été enregistrée');
        document.getElementById('condoleanceForm').reset();
        // Recharger les condoléances depuis Sheets
        loadCondolencesFromSheet();
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'envoi de la condoléance');
    });
}

function loadCondolencesFromSheet() {
    fetch(GOOGLE_SHEET_URL + '?action_type=condoleances')
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success' && data.data) {
                // Afficher directement sans passer par localStorage
                displayCondolencesFromData(data.data);
            }
        })
        .catch(error => {
            console.error('Erreur chargement condoléances:', error);
            // Afficher message par défaut en cas d'erreur
            displayDefaultCondolence();
        });
}

function displayCondolencesFromData(condolencesData) {
    const container = document.getElementById('condoleancesList');
    container.innerHTML = '';
    
    if (condolencesData.length === 0) {
        displayDefaultCondolence();
        return;
    }
    
    condolencesData.forEach(condolence => {
        const condolenceDiv = document.createElement('div');
        condolenceDiv.className = 'condolence';
        condolenceDiv.innerHTML = `
            <div class="condolence-author">${condolence.nom}</div>
            <p>${condolence.message}</p>
        `;
        container.appendChild(condolenceDiv);
    });
}

function displayDefaultCondolence() {
    const container = document.getElementById('condoleancesList');
    container.innerHTML = `
        <div class="condolence">
            <div class="condolence-author">Famille EXAMPLE</div>
            <p>Nos pensées et prières accompagnent vos familles dans cette épreuve. Que leurs âmes reposent en paix.</p>
        </div>
    `;
}

// NOUVELLE FONCTION handleDonation dans script.js (à partir de la ligne ~298)
function handleDonation(event) {
    event.preventDefault();

    const nom = document.getElementById('don-nom').value;
    const telephone = document.getElementById('don-telephone').value;
    const montant = document.getElementById('don-montant').value;
    // NOTE : L'opérateur n'est pas utilisé dans le formulaire index.html, 
    // donc nous l'omettons ici. Si vous l'ajoutez, vous devrez le récupérer.
    const message = document.getElementById('don-message').value;
    
    // Le formulaire index.html ne contient pas d'input pour l'opérateur,
    // mais si on se fie aux champs requis, on s'en tient à Nom, Tél, Montant.
    if (!nom || !telephone || !montant) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    // Logique d'envoi des données au backend (Google Sheets)
    const formData = new URLSearchParams({
        action_type: 'donation', // C'est la clé que l'Apps Script recherche
        nom: nom,
        telephone: telephone,
        montant: montant, // Envoyons le montant
        message: message
    });

    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
    .then(() => {
        // Afficher un message de confirmation
        alert('✓ Votre don a été enregistré dans le registre (N\'oubliez pas de l\'effectuer via Mobile Money)');
        
        // Réinitialiser le formulaire
        document.getElementById('donForm').reset();
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'envoi du don : ' + error.message);
    });
}

/**
 * Charge les éléments du menu depuis Google Sheets via l'Apps Script.
 */
function loadMenuFromSheet() {
    fetch(GOOGLE_SHEET_URL + '?action_type=menu')
        .then(response => {
            if (!response.ok) {
                // Tenter de lire le corps même en cas d'erreur réseau pour debug
                return response.text().then(text => { throw new Error('Network error or bad response: ' + text) });
            }
            return response.json();
        })
        .then(data => {
            if (data.result === 'success' && data.data) {
                displayMenu(data.data);
            } else {
                console.error('Erreur Apps Script lors du chargement du menu:', data.message);
                displayDefaultMenu();
            }
        })
        .catch(error => {
            console.error('Erreur chargement menu:', error);
            displayDefaultMenu();
        });
}

function displayMenu(menuData) {
    const menuGrid = document.querySelector('#menu .menu-grid');
    if (!menuGrid) return;

    // Vider la grille existante
    menuGrid.innerHTML = '';

    if (menuData.length === 0) {
        menuGrid.innerHTML = '<p>Aucun menu n\'est disponible pour le moment.</p>';
        return;
    }

    menuData.forEach(item => {
        // Crée un identifiant unique basé sur le titre (sans espaces ni caractères spéciaux)
        const dataItem = item.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-'); 
        
        const menuItemDiv = document.createElement('div');
        // NOTE: On utilise dataItem comme clé unique.
        menuItemDiv.className = 'menu-item';
        menuItemDiv.setAttribute('onclick', 'toggleMenuItem(this)');
        menuItemDiv.setAttribute('data-item', dataItem);
        menuItemDiv.innerHTML = `
            <h4>${item.titre}</h4>
            <p>${item.description}</p>
        `;
        menuGrid.appendChild(menuItemDiv);
    });
    
    // Ré-appliquer la sélection si l'utilisateur avait une inscription existante
    checkExistingRegistration();
}

/**
 * Affiche le menu par défaut en cas d'erreur de chargement.
 */
function displayDefaultMenu() {
    const menuGrid = document.querySelector('#menu .menu-grid');
    if (!menuGrid) return;
    
    // Contenu par défaut (similaire à index.html)
    menuGrid.innerHTML = `
        <div class="menu-item" onclick="toggleMenuItem(this)" data-item="plat-traditionnel">
            <h4>Plat Traditionnel</h4>
            <p>Ndolè, Taro, Macabo</p>
        </div>
        <div class="menu-item" onclick="toggleMenuItem(this)" data-item="viande-grillée">
            <h4>Viande Grillée</h4>
            <p>Porc, Bœuf, Poulet</p>
        </div>
        <div class="menu-item" onclick="toggleMenuItem(this)" data-item="poisson-braisé">
            <h4>Poisson Braisé</h4>
            <p>Accompagnements variés</p>
        </div>
        <div class="menu-item" onclick="toggleMenuItem(this)" data-item="option-végétarienne">
            <h4>Option Végétarienne</h4>
            <p>Légumes et céréales</p>
        </div>
    `;
}

/**
 * Gère le téléchargement du fichier PDF "Faire part" au lieu de générer un fichier texte.
 */
function downloadProgramme() {
    // A MODIFIER SI VOTRE FICHIER EST DANS UN SOUS-DOSSIER
    // Exemple si le fichier est dans un dossier 'programme': const PDF_FILE_PATH = 'programme/Faire part.pdf';
    const PDF_FILE_PATH = 'programme/Faire part.pdf';
    const DOWNLOAD_NAME = 'Faire part - Hommage Coutumier.pdf';

    // 1. Créer un élément <a> (lien)
    const a = document.createElement('a');
    
    // 2. Définir le chemin vers le fichier PDF
    a.href = PDF_FILE_PATH; 
    
    // 3. Définir le nom sous lequel le fichier sera téléchargé
    a.download = DOWNLOAD_NAME;
    
    // 4. Ajouter le lien au corps du document, cliquer dessus, puis le supprimer
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert(`Le document "${DOWNLOAD_NAME}" a été lancé en téléchargement.`);
}

// Navigation douce
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
