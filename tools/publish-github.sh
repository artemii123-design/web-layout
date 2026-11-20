#!/bin/bash
# Создаёт приватный репозиторий на GitHub и заливает туда эту папку.
# Запускать после `gh auth login`. Пароли и токены скрипт не просит и не хранит:
# он пользуется тем входом, который уже сделан через gh.
set -e

GH=/opt/homebrew/bin/gh
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:-web-layout}"
VIS="${2:---private}"

cd "$REPO_DIR"

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Сначала войдите: $GH auth login --hostname github.com --git-protocol https --web"
  exit 1
fi

LOGIN=$("$GH" api user --jq .login)
UID_GH=$("$GH" api user --jq .id)
EMAIL="${UID_GH}+${LOGIN}@users.noreply.github.com"

echo "Аккаунт: $LOGIN"
echo "Подпись коммитов: $EMAIL"

git config user.name "$LOGIN"
git config user.email "$EMAIL"

# переписать авторство уже сделанных коммитов на скрытый адрес
git rebase --root --exec "git commit --amend --reset-author --no-edit" >/dev/null

"$GH" repo create "$NAME" "$VIS" \
  --source . --remote origin --push \
  --description "Репозиторий веб-вёрстки: принципы, замеры и приёмы для сайта прихода"

echo
echo "Готово: $("$GH" repo view "$LOGIN/$NAME" --json url --jq .url)"
