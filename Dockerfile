# Étape 1 : Build de l'application Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copie des fichiers de configuration
COPY package.json package-lock.json ./

# Installation des dépendances
RUN npm ci || npm install

# Copie du code source
COPY . .

# Construction de l'application (le SSR va générer le dossier dist/Front-Batiment)
RUN npm run build

# Étape 2 : Image de production pour exécuter le serveur SSR Node.js
FROM node:20-alpine AS production

WORKDIR /app

# Copie des artefacts de build depuis l'étape précédente
COPY --from=build /app/dist/Front-Batiment ./dist/Front-Batiment

# Configuration du port par défaut pour le serveur SSR Angular
ENV PORT=4000
EXPOSE 4000

# Commande pour démarrer le serveur SSR
CMD ["node", "dist/Front-Batiment/server/server.mjs"]
