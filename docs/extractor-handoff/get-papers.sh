#!/usr/bin/env bash
# Fetch the question papers from the question-papers branch and unpack them
# where the extractor looks for them. Safe to run twice.
set -euo pipefail

DEST="${1:-$HOME/Documents/Question_Papers}"
cd "$(git rev-parse --show-toplevel)"
git fetch --depth 1 origin question-papers

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$DEST"
for subject in Physics_5054 Chem_5070 Add_Maths_4037; do
  git show "FETCH_HEAD:$subject.zip" > "$tmp/$subject.zip"
  # Python rather than unzip: it is there wherever the extractor's tools are.
  python3 -m zipfile -e "$tmp/$subject.zip" "$DEST"
  echo "$subject: $(find "$DEST/$subject" -name '*_qp_*.tex' | wc -l) papers"
done
