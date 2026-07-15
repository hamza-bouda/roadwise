# RoadWise — Plateforme de detection et gestion des defauts routiers

RoadWise est une plateforme complete organisee en 3 modules :

| Module | Dossier | Stack |
|--------|---------|-------|
| API backend | `backend/` | Java 17 · Spring Boot 3.4.5 · Maven · Firebase Admin · JavaMail |
| Dashboard web | `frontend/` | React 18 · Vite · TypeScript · Electron · Tailwind · shadcn/ui · Leaflet · Recharts |
| App mobile | `mobile/` | Flutter 3 · Dart · Firebase · Google Maps · Camera |

---

## Structure du projet

```
roadwise/
├── backend/
│   ├── src/main/java/com/road_maintenance/
│   │   ├── controller/     DashboardController, MaintenanceController,
│   │   │                   ReportController, TeamController, UserController,
│   │   │                   MaintenanceAutomationController
│   │   ├── service/        Logique metier (Dashboard, Maintenance, Report, Team, User)
│   │   ├── model/          Entites : Maintenance, Report, Team, User, DashboardStats
│   │   ├── dto/            DTOs : MaintenanceDTO, ReportDTO, TeamDTO, UserDTO
│   │   └── config/         SecurityConfig, FirebaseConfig, CorsConfig, MailConfig
│   ├── src/main/resources/
│   │   ├── application.properties         Config port + mail SMTP
│   │   └── firebase-service-account.json  A remplacer (voir Configuration)
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── pages/          Dashboard, Login, Map, SignalementsList, SignalementDetails,
│   │   │                   MaintenancesList, MaintenanceDetails, PendingMaintenances,
│   │   │                   Teams, Profile
│   │   ├── components/     Layout, CreateMaintenanceForm + composants shadcn/ui
│   │   ├── services/       dataService.ts (appels API backend)
│   │   ├── contexts/       AuthContext (Firebase Auth)
│   │   ├── lib/            firebase.ts (init Firebase)
│   │   └── types/          index.ts (types partages)
│   ├── electron.js         Entry point Electron (app desktop)
│   ├── vite.config.ts
│   └── package.json
│
├── mobile/
│   ├── lib/
│   │   ├── screens/
│   │   │   ├── auth/       LoginScreen, SignupScreen
│   │   │   ├── user/       HomeScreen, DetectionScreen, MapScreen,
│   │   │   │               ReportFormScreen, HistoryScreen, SettingsScreen
│   │   │   └── technician/ TechnicianHome, MaintenanceList, MaintenanceDetail,
│   │   │                   TechnicianMap, TechnicianSettings
│   │   ├── services/
│   │   │   ├── auth/       AuthService (Firebase Auth)
│   │   │   ├── user/       ReportService, DetectionService
│   │   │   └── technician/ MaintenanceService, SignalementService
│   │   ├── providers/      AuthProvider, UserProvider, TechnicianProvider, ThemeProvider
│   │   ├── models/         User, Report, Maintenance
│   │   ├── widgets/        AppDrawer, AppMap
│   │   └── src/keys.dart   Cle Google Maps (voir Configuration)
│   ├── android/app/
│   │   └── google-services.json  A remplacer (voir Configuration)
│   └── pubspec.yaml
│
├── .gitignore
└── README.md
```

---

## Prerequis

### Backend
- Java 17+
- Maven 3.8+ (ou utiliser `./mvnw` inclus dans le projet)
- Un projet Firebase avec Firestore active
- Un compte Gmail avec un App Password pour l'envoi de mails

### Frontend
- Node.js 18+
- npm (inclus avec Node)
- Le meme projet Firebase (pour l'authentification)

### Mobile
- Flutter SDK 3.x (https://flutter.dev/docs/get-started/install)
- Android Studio (emulateur Android) ou Xcode (iOS, macOS uniquement)
- Le meme projet Firebase

---

## Configuration des secrets

Aucun fichier de configuration reel n'est inclus dans le repo. Vous devez creer les votres.

### 1. Firebase (commun aux 3 modules)

1. Aller sur https://console.firebase.google.com
2. Creer ou ouvrir votre projet
3. Activer Authentication (Google Sign-In) et Firestore

### 2. Backend

**firebase-service-account.json**

1. Firebase Console > Project Settings > Service accounts
2. Cliquer "Generate new private key" et telecharger le JSON
3. Le placer dans : `backend/src/main/resources/firebase-service-account.json`

**application.properties** — editer `backend/src/main/resources/application.properties` :

```properties
spring.application.name=roadWise-management
server.port=9090

spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=VOTRE_ADRESSE@gmail.com
spring.mail.password=VOTRE_APP_PASSWORD_GMAIL
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

### 3. Frontend

Creer `frontend/.env` :

```
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_projet_id
VITE_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
VITE_API_URL=http://localhost:9090
```

Ces valeurs se trouvent dans Firebase Console > Project Settings > Your apps > Config.

### 4. Mobile

**Cle Google Maps** — editer `mobile/lib/src/keys.dart` :

```dart
const String kGoogleMapsApiKey = 'VOTRE_CLE_GOOGLE_MAPS';
```

Obtenez une cle sur https://console.cloud.google.com/apis/credentials en activant Maps SDK for Android.

**Firebase Android** :
1. Firebase Console > Project Settings > Your apps > Android
2. Telecharger `google-services.json`
3. Le placer dans `mobile/android/app/google-services.json`

**Firebase iOS** (si besoin) :
1. Firebase Console > Your apps > iOS
2. Telecharger `GoogleService-Info.plist`
3. Le placer dans `mobile/ios/Runner/GoogleService-Info.plist`

---

## Installation et lancement

### 1. Cloner le repo

```bash
git clone https://github.com/hamza-bouda/roadwise.git
cd roadwise
```

### 2. Backend (Spring Boot)

```bash
cd backend

# Placer firebase-service-account.json dans src/main/resources/
# Editer application.properties avec vos credentials mail

# Lancer (Linux/macOS)
./mvnw spring-boot:run

# Lancer (Windows)
mvnw.cmd spring-boot:run
```

L'API demarre sur : http://localhost:9090

La collection Postman des endpoints est disponible dans `POSTMAN.txt`.

### 3. Frontend (React + Electron)

```bash
cd frontend
npm install

# Creer le fichier .env (voir Configuration)

# Mode navigateur
npm run dev
# Disponible sur http://localhost:5173

# Mode application desktop
npm run electron

# Les deux en meme temps (recommande)
npm start
```

### 4. Mobile (Flutter)

```bash
cd mobile

# Placer google-services.json et renseigner keys.dart

flutter pub get

# Voir les devices disponibles
flutter devices

# Lancer sur Android
flutter run

# Lancer sur iOS (macOS uniquement)
flutter run -d ios

# Build APK Android
flutter build apk --release
```

---

## Ordre de demarrage recommande

```bash
# Terminal 1 - Backend
cd backend
./mvnw spring-boot:run

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - Mobile
cd mobile
flutter run
```

---

## Architecture

```
+-----------------------------------------------------------------+
|                        UTILISATEURS                             |
|                                                                 |
|  Technicien (mobile)          Admin / Agent (frontend)          |
|  Recoit les missions          Gere alertes + equipes            |
|                                                                 |
|  Citoyen (mobile)                                               |
|  Detecte, signale, suit                                         |
+------------------+----------------------------+-----------------+
                   |       HTTP REST            |
                   v                            v
+-----------------------------------------------------------------+
|           Backend Spring Boot 3.4.5  (port 9090)               |
|                                                                 |
|  /dashboard      stats globales                                 |
|  /reports        signalements citoyens                          |
|  /maintenances   interventions                                  |
|  /teams          equipes terrain                                |
|  /users          gestion utilisateurs                           |
|  /automation     assignation automatique                        |
|                                                                 |
|  Firebase Admin SDK (Auth + Firestore + FCM)                    |
|  JavaMail (notifications email SMTP Gmail)                      |
+-----------------------------+-----------------------------------+
                              |
                              v
                 +------------------------+
                 |   Firebase Firestore   |
                 |    (base de donnees)   |
                 +------------------------+
```

---

## Fonctionnalites

### App Mobile (Flutter)

Role Citoyen :
- Authentification (email/password + Google Sign-In via Firebase)
- Detection de nids-de-poule via camera (DetectionScreen)
- Creation d'un signalement avec photo + geolocalisation (ReportFormScreen)
- Visualisation de ses signalements sur carte Google Maps (MapScreen)
- Historique des signalements et suivi des statuts (HistoryScreen)
- Parametres et theme clair/sombre (SettingsScreen)

Role Technicien :
- Liste des maintenances assignees (MaintenanceList)
- Detail d'une mission avec signalement associe (MaintenanceDetail)
- Carte des interventions terrain avec navigation (TechnicianMap)
- Mise a jour du statut des interventions

### Dashboard Frontend (React + Electron)

- Login : authentification Firebase
- Dashboard : KPIs et statistiques avec graphiques Recharts
- Signalements : liste et detail de toutes les alertes citoyens
- Carte : visualisation geographique avec Leaflet + Mapbox
- Maintenances : creation, assignation, suivi des interventions
- Equipes : creation et gestion des equipes terrain
- Profil : gestion du compte
- Application desktop standalone via Electron

### API Backend (Spring Boot)

| Controleur | Endpoints | Description |
|------------|-----------|-------------|
| DashboardController | GET /dashboard/stats | KPIs globaux |
| ReportController | GET/POST/PUT/DELETE /reports | Signalements citoyens |
| MaintenanceController | GET/POST/PUT/DELETE /maintenances | Interventions |
| MaintenanceAutomationController | POST /automation/... | Assignation automatique |
| TeamController | GET/POST/PUT /teams | Equipes terrain |
| UserController | GET/POST/PUT /users | Utilisateurs et roles |

Toutes les routes sont protegees via Firebase Auth (token JWT verifie par SecurityConfig).

---

## Pousser sur GitHub

```bash
git add .
git commit -m "feat: description de vos changements"
git push
```

---

## Licence

MIT
