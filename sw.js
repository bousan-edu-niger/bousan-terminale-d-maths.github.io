/* ==========================================================================
   BOUSAN PWA — GESTIONNAIRE DE CACHE & SERVICE WORKER HORS-LIGNE PREMIUM
   ========================================================================== */

// Nom unique du cache (Incrémenter la version v1 en v2 si vous modifiez un cours)
const CACHE_NAME = 'bousan-mathsd-v1';

// Liste complète des ressources système et des pages à stocker hors-ligne
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './manifest.json',
    './images/icon-192.png',
    './images/icon-512.png',
    './images/logo-nav.png',
    './images/splash-screen.png',
    './images/banner-169.png',
    
    // Pages des modules gratuits
    './cours/index.html',
    './exercices/index.html',
    './quiz/index.html',
    
    // Pages des modules Premium (Payants débloqués)
    './livre/index.html',
    './annales/index.html'
];

// 1. ÉVÉNEMENT 'INSTALL' : Téléchargement immédiat et mise en cache des fichiers
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('BOUSAN PWA : Téléchargement et mise en cache des ressources système réussis.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Force le Service Worker à s'activer sans attendre la fermeture des anciennes sessions
                return self.skipWaiting();
            })
    );
});

// 2. ÉVÉNEMENT 'ACTIVATE' : Nettoyage des fichiers obsolètes lors d'une mise à jour de l'app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('BOUSAN PWA : Suppression de l\'ancien cache obsolète :', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Permet au Service Worker de prendre instantanément le contrôle de la PWA
            return self.clients.claim();
        })
    );
});

// 3. ÉVÉNEMENT 'FETCH' : Stratégie Network-First (Réseau d'abord, Cache en secours)
self.addEventListener('fetch', (event) => {
    
    // 🔒 SÉCURITÉ VITAL : Ne jamais intercepter ni mettre en cache les requêtes serveurs Firebase
    // La vérification en temps réel de la licence unique (UUID) doit obligatoirement transiter en direct.
    if (
        event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis.com') || 
        event.request.url.includes('firestore')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si l'appareil a du réseau, on met à jour le cache local de l'élève en arrière-plan
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si l'élève n'a pas accès à Internet (mode hors-ligne), le cache prend le relais
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Message de sécurité si une ressource payante ou non visitée est demandée sans Internet
                    return new Response("Ressource indisponible hors-ligne. Veuillez vous connecter à Internet pour synchroniser vos accès premium.", {
                        status: 503,
                        statusText: "Service Unavailable",
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});
