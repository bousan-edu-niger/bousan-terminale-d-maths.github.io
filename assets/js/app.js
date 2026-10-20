/* ==========================================================================
   BOUSAN PWA — SECURE NETWORK LICENSE & THEME MANAGER (PARTIE 1)
   ========================================================================== */

// Configuration des clés de stockage local (Mémoire interne du smartphone)
const BOUSAN_CONFIG = {
    localStorageLicenseKey: 'bousan_licensed_status',
    localStorageUuidKey: 'bousan_device_uuid',
    localStorageThemeKey: 'bousan_theme'
};

/* ==========================================================================
   1. GESTION DYNAMIQUE DU THÈME (MODE CLAIR / MODE SOMBRE)
   ========================================================================== */
function updateThemeButtonText() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    
    if (document.body.classList.contains('dark-theme')) {
        btn.innerText = "Mode Clair";
    } else {
        btn.innerText = "Mode Sombre";
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem(BOUSAN_CONFIG.localStorageThemeKey);
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeButtonText();
}

function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem(BOUSAN_CONFIG.localStorageThemeKey, 'light');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem(BOUSAN_CONFIG.localStorageThemeKey, 'dark');
    }
    updateThemeButtonText();
}

/* ==========================================================================
   2. GENERATION DE L'EMPREINTE APPAREIL ET EXTRACTION DU MODELE
   ========================================================================== */
function obtenirInfosAppareil() {
    const ua = navigator.userAgent;
    let systeme = "Système Inconnu";
    let navigateur = "Navigateur Inconnu";
    let modeleBrut = "";

    // 1. Détection du Système et extraction du modèle technique Android
    if (ua.includes("Android")) {
        systeme = "Android";
        const matchAndroid = ua.match(/\(([^)]+)\)/);
        if (matchAndroid && matchAndroid[1]) {
            const parts = matchAndroid[1].split(';');
            if (parts.length >= 3) {
                // Filtre les mentions de version pour cibler le code modèle constructeur
                let cible = parts[parts.length - 1].trim();
                if (cible.startsWith("Build/")) {
                    cible = parts[parts.length - 2].trim();
                }
                modeleBrut = " (" + cible + ")";
            } else {
                modeleBrut = " (" + parts[0].trim() + ")";
            }
        }
    } 
    else if (ua.includes("iPhone")) systeme = "iPhone (iOS)";
    else if (ua.includes("iPad")) systeme = "iPad (iOS)";
    else if (ua.includes("Windows")) systeme = "Windows (PC)";
    else if (ua.includes("Macintosh")) systeme = "Mac (Apple)";
    else if (ua.includes("Linux")) systeme = "Linux";

    // 2. Détection fine du Navigateur
    if (ua.includes("Edg/")) navigateur = "Microsoft Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Edg/")) navigateur = "Google Chrome";
    else if (ua.includes("Firefox/")) navigateur = "Mozilla Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) navigator = "Apple Safari";

    return `${navigateur} sur ${systeme}${modeleBrut}`;
}

function generateDeviceUUID() {
    let uuid = localStorage.getItem(BOUSAN_CONFIG.localStorageUuidKey);
    if (!uuid) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(BOUSAN_CONFIG.localStorageUuidKey, uuid);
        console.log("📱 [BOUSAN SECURITY] Nouvel UUID généré :", uuid);
    } else {
        console.log("📱 [BOUSAN SECURITY] UUID existant détecté :", uuid);
    }
    console.log("🔍 [BOUSAN SECURITY] Modèle détecté :", obtenirInfosAppareil());
    return uuid;
}
/* ==========================================================================
   3. CONTROLE DES ACCES ET VERROUILLAGE DE L'INTERFACE UI (PARTIE 2)
   ========================================================================== */
function checkDeviceLicenseStatus() {
    const isLicensed = localStorage.getItem(BOUSAN_CONFIG.localStorageLicenseKey) === 'true';
    const gateSection = document.getElementById('activation-gate');
    const accountSection = document.getElementById('account-status');

    if (isLicensed) {
        if (gateSection) gateSection.style.display = 'none';
        if (accountSection) accountSection.style.display = 'block';
        console.log("🔓 [BOUSAN ACCESS] Accès premium débloqué localement.");
    } else {
        if (gateSection) gateSection.style.display = 'block';
        if (accountSection) accountSection.style.display = 'none';
        console.log("🔒 [BOUSAN ACCESS] En attente de validation du code d'activation.");
    }
}

/* ==========================================================================
   4. VALIDATION ET SÉCURISATION DU CODE VIA CLOUD FIRESTORE SERVEUR
   ========================================================================== */
function checkActivationCode() {
    const codeInput = document.getElementById('activation-code').value.trim().toUpperCase();
    const messageElement = document.getElementById('activation-message');
    const currentDeviceUuid = localStorage.getItem(BOUSAN_CONFIG.localStorageUuidKey);
    const detailAppareil = obtenirInfosAppareil();

    if (codeInput === "") {
        messageElement.style.color = "#ef4444";
        messageElement.innerText = "⚠️ Veuillez saisir votre clé d'accès.";
        return;
    }

    messageElement.style.color = "#1b75bb";
    messageElement.innerText = "🔄 Connexion au serveur BOUSAN en cours...";

    const licenceRef = db.collection("licences").doc(codeInput);

    licenceRef.get().then((doc) => {
        if (!doc.exists) {
            messageElement.style.color = "#ef4444";
            messageElement.innerText = "❌ Clé d'accès invalide. Vérifiez l'orthographe.";
            return;
        }

        const data = doc.data();

        // 🟢 CAS N°1 : Le code est neuf, disponible et jamais activé
        if (data.status === "disponible") {
            licenceRef.update({
                status: "utilise",
                device_uuid: currentDeviceUuid,
                nom_appareil: detailAppareil, // Enregistrement anti-triche du modèle technique
                activated_at: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                messageElement.style.color = "#2e7d32";
                messageElement.innerText = "⚡ Activation réussie ! Ce téléphone est désormais enregistré.";
                
                localStorage.setItem(BOUSAN_CONFIG.localStorageLicenseKey, 'true');
                
                setTimeout(() => {
                    checkDeviceLicenseStatus();
                    if (messageElement) messageElement.innerText = "";
                    document.getElementById('activation-code').value = "";
                }, 1500);
            }).catch((error) => {
                messageElement.style.color = "#ef4444";
                messageElement.innerText = "❌ Erreur de synchronisation réseau. Réessayez.";
                console.error("Firebase Update Error:", error);
            });

        // 🔴 CAS N°2 : Le code a déjà été activé par le passé
        } else if (data.status === "utilise") {
            if (data.device_uuid === currentDeviceUuid) {
                messageElement.style.color = "#2e7d32";
                messageElement.innerText = "🔄 Reconnexion à votre espace d'étude...";
                
                localStorage.setItem(BOUSAN_CONFIG.localStorageLicenseKey, 'true');
                
                setTimeout(() => {
                    checkDeviceLicenseStatus();
                    if (messageElement) messageElement.innerText = "";
                    document.getElementById('activation-code').value = "";
                }, 1500);
            } else {
                messageElement.style.color = "#ef4444";
                messageElement.innerText = "🔒 Ce code est déjà lié à un autre smartphone. Accès refusé.";
            }
        }

    }).catch((error) => {
        messageElement.style.color = "#ef4444";
        messageElement.innerText = "⚠️ Erreur réseau : Impossible de contacter le serveur. Vérifiez votre connexion.";
        console.error("Firebase Get Error:", error);
    });
}
/* ==========================================================================
   5. SÉCURITÉ DE DÉCONNEXION VOLONTAIRE (PARTIE 3)
   ========================================================================== */
function logoutDevice() {
    if (confirm("Se déconnecter ? L'accès à votre Livre complet et aux Annales sera reverrouillé jusqu'à la prochaine saisie de votre code.")) {
        localStorage.removeItem(BOUSAN_CONFIG.localStorageLicenseKey);
        checkDeviceLicenseStatus();
        console.log("🔒 [BOUSAN SECURITY] Appareil déconnecté volontairement.");
    }
}

/* ==========================================================================
   6. INITIALISATION AUTOMATIQUE AU CHARGEMENT DE LA PWA
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    generateDeviceUUID();
    checkDeviceLicenseStatus();
});

// Liaison officielle du Service Worker (sw.js) pour la mise en cache hors-ligne
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker lié à la PWA avec succès.', reg.scope))
            .catch(err => console.log('❌ Échec de liaison du Service Worker :', err));
    });
}
