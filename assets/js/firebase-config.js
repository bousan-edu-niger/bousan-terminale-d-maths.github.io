/* ==========================================================================
   BOUSAN PWA — MODULE DE LIAISON ET CONFIGURATION CLOUD FIREBASE OFFICIEL
   ========================================================================== */

// Vos clés de connexion exclusives et sécurisées Google Cloud Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDCpCC0zPyWCs-RrySHaGcHyOPVk_4DBeg",
    authDomain: "bousan-terminale-d-maths.firebaseapp.com",
    projectId: "bousan-terminale-d-maths",
    storageBucket: "bousan-terminale-d-maths.firebasestorage.app",
    messagingSenderId: "1047529002946",
    appId: "1:1047529002946:web:f66bff3996569a3165685b"
};

// Initialisation officielle des modules réseau Firebase PWA
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Activation automatique de la persistance des données pour le mode Hors-Ligne
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("⚠️ Persistance impossible : Plusieurs onglets sont ouverts simultanément.");
    } else if (err.code == 'unimplemented') {
        console.warn("⚠️ Le navigateur actuel ne prend pas en compte le stockage hors-ligne.");
    }
});
