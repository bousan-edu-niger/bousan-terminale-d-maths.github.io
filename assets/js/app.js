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
/**
 * Met à jour dynamiquement l'intitulé textuel du bouton de thème.
 * Affiche l'action future proposée à l'élève.
 */
function updateThemeButtonText() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    
    // Si le mode sombre est actif, le bouton propose de revenir au mode clair
    if (document.body.classList.contains('dark-theme')) {
        btn.innerText = "Mode Clair";
    } else {
        btn.innerText = "Mode Sombre";
    }
}

/**
 * Initialise le thème graphique au chargement de la page.
 * Prend en compte les choix passés ou les préférences système du smartphone.
 */
function initTheme() {
    const savedTheme = localStorage.getItem(BOUSAN_CONFIG.localStorageThemeKey);
    
    // Vérifie le choix stocké ou les préférences du système du téléphone
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeButtonText();
}

/**
 * Alterne l'affichage entre le mode clair et le mode sombre au clic.
 */
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
   2. GENERATION DE L'EMPREINTE APPAREIL UNIQUE (UUID V4 ROBUSTE)
   ========================================================================== */
/**
 * Génère ou récupère un UUID unique persistant pour identifier le téléphone.
 * Cette signature numérique anonyme protège votre travail contre les partages de code.
 */
function generateDeviceUUID() {
    let uuid = localStorage.getItem(BOUSAN_CONFIG.localStorageUuidKey);
    if (!uuid) {
        // Algorithme standard de génération d'UUID v4 indépendant du matériel privé
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(BOUSAN_CONFIG.localStorageUuidKey, uuid);
        console.log("📱 [BOUSAN SECURITY] Nouvel UUID généré pour cet appareil :", uuid);
    } else {
        console.log("📱 [BOUSAN SECURITY] UUID existant détecté :", uuid);
    }
    return uuid;
}

/* ==========================================================================
   3. CONTROLE DES ACCES ET VERROUILLAGE DE L'INTERFACE UI
   ========================================================================== */
/**
 * Analyse l'état de la licence stockée localement sur l'appareil.
 * Gère l'affichage logique des formulaires d'activation et de déconnexion.
 */
function checkDeviceLicenseStatus() {
    const isLicensed = localStorage.getItem(BOUSAN_CONFIG.localStorageLicenseKey) === 'true';
    const gateSection = document.getElementById('activation-gate');
    const accountSection = document.getElementById('account-status');

    if (isLicensed) {
        // Mode Autorisé : L'appareil est en règle. On cache la saisie et on montre l'espace compte.
        if (gateSection) gateSection.style.display = 'none';
        if (accountSection) accountSection.style.display = 'block';
        console.log("🔓 [BOUSAN ACCESS] Accès premium débloqué localement.");
    } else {
        // Mode Verrouillé : Le contenu premium reste protégé en attente du jeton en ligne.
        if (gateSection) gateSection.style.display = 'block';
        if (accountSection) accountSection.style.display = 'none';
        console.log("🔒 [BOUSAN ACCESS] En attente de validation du code d'activation.");
    }
}
/* ==========================================================================
   4. VALIDATION ET SÉCURISATION DU CODE VIA CLOUD FIRESTORE SERVEUR
   ========================================================================== */
/**
 * Interroge en temps réel la base de données Firestore pour valider le ticket d'accès.
 * Si disponible : Verrouille définitivement le code avec l'UUID de ce smartphone.
 * Si déjà utilisé par un autre appareil : Bloque immédiatement l'accès.
 */
function checkActivationCode() {
    const codeInput = document.getElementById('activation-code').value.trim().toUpperCase();
    const messageElement = document.getElementById('activation-message');
    const currentDeviceUuid = localStorage.getItem(BOUSAN_CONFIG.localStorageUuidKey);

    if (codeInput === "") {
        messageElement.style.color = "#ef4444";
        messageElement.innerText = "⚠️ Veuillez saisir votre clé d'accès.";
        return;
    }

    messageElement.style.color = "#1b75bb";
    messageElement.innerText = "🔄 Connexion au serveur BOUSAN en cours...";

    // 📡 Requête vers le document portant le nom exact du code dans Firestore
    const licenceRef = db.collection("licences").doc(codeInput);

    licenceRef.get().then((doc) => {
        if (!doc.exists) {
            // Le code n'existe pas du tout dans la base de données de l'administrateur
            messageElement.style.color = "#ef4444";
            messageElement.innerText = "❌ Clé d'accès invalide. Vérifiez l'orthographe.";
            return;
        }

        const data = doc.data();

        // 🟢 CAS N°1 : Le code est neuf, disponible et jamais activé
        if (data.status === "disponible") {
            // Association exclusive et définitive de ce code avec l'UUID de ce téléphone
            licenceRef.update({
                status: "utilise",
                device_uuid: currentDeviceUuid,
                activated_at: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                messageElement.style.color = "#2e7d32";
                messageElement.innerText = "⚡ Activation réussie ! Ce téléphone est désormais enregistré.";
                
                // Active la licence dans la mémoire locale du navigateur
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
            // On vérifie si l'UUID du téléphone actuel correspond bien à celui sur le serveur
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
                // L'UUID ne correspond pas : c'est un deuxième élève qui tente d'utiliser le même code !
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
   5. SÉCURITÉ DE DÉCONNEXION VOLONTAIRE
   ========================================================================== */
/**
 * Supprime la licence active de l'appareil et reverrouille immédiatement l'accès.
 * L'élève devra retaper son code pour accéder à nouveau au Livre et aux Annales.
 */
function logoutDevice() {
    if (confirm("Se déconnecter ? L'accès à votre Livre complet et aux Annales sera reverrouillé jusqu'à la prochaine saisie de votre code.")) {
        // Révocation de la licence locale dans le navigateur
        localStorage.removeItem(BOUSAN_CONFIG.localStorageLicenseKey);
        
        // Verrouillage visuel instantané de l'interface
        checkDeviceLicenseStatus();
        console.log("🔒 [BOUSAN SECURITY] Appareil déconnecté volontairement.");
    }
}

/* ==========================================================================
   6. INITIALISATION AUTOMATIQUE AU CHARGEMENT DE LA PWA
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialise le mode de couleur (Clair ou Sombre)
    initTheme();
    
    // 2. Génère ou récupère la signature unique (UUID) du smartphone
    generateDeviceUUID();
    
    // 3. Analyse les droits d'accès locaux pour l'affichage de l'UI
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
