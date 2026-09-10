#!/usr/bin/env sh
# Grimoire — déploiement sur un VPS. À lancer SUR le VPS.
#
#   sudo sh deploy/deploy.sh                       # depuis un clone du dépôt
#   REPO=https://github.com/XxWirexX/witch-hat-atelier.git sh -            # ou tout seul :
#   curl -fsSL https://raw.githubusercontent.com/XxWirexX/witch-hat-atelier/main/deploy/deploy.sh | sudo sh
#
# Le site est entièrement statique : on copie les fichiers servis, rien d'autre.
# Aucun build, aucun runtime, aucune dépendance sur le serveur.
set -eu

REPO="${REPO:-https://github.com/XxWirexX/witch-hat-atelier.git}"
BRANCH="${BRANCH:-main}"
DEST="${DEST:-/var/www/grimoire}"
OWNER="${OWNER:-www-data:www-data}"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "→ récupération de $REPO ($BRANCH)"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$work/src"

# Ce qui est servi au navigateur, et rien de plus : ni tests, ni scripts, ni .git.
echo "→ installation dans $DEST"
mkdir -p "$DEST"
for path in index.html styles.css manifest.webmanifest sw.js src icons; do
  rm -rf "$DEST/${path:?}"
  cp -r "$work/src/$path" "$DEST/$path"
done

chown -R "$OWNER" "$DEST" 2>/dev/null || echo "  (propriétaire inchangé : lance en root pour $OWNER)"
find "$DEST" -type d -exec chmod 755 {} +
find "$DEST" -type f -exec chmod 644 {} +

echo "✓ déployé — $(git -C "$work/src" rev-parse --short HEAD)"
echo "  Sers $DEST avec deploy/Caddyfile ou deploy/nginx.conf."
