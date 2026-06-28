#!/usr/bin/env bash
set -euo pipefail

FONT_DIR="src/main/resources/static/assets/fonts"
mkdir -p "$FONT_DIR"

BASE="https://github.com/googlefonts/dm-sans/raw/main/fonts/ttf"
for file in DMSans-Regular DMSans-Medium DMSans-SemiBold DMSans-Bold DMSans-ExtraBold; do
  curl -fsSL "$BASE/${file}.ttf" -o "$FONT_DIR/${file}.ttf"
  echo "Downloaded ${file}.ttf"
done
