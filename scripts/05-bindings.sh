#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$SCRIPT_DIR/../contracts/public_offer"
OUTPUT_DIR="$SCRIPT_DIR/../web/src/lib/contract-client"

cd "$CONTRACT_DIR"
stellar contract build

stellar contract bindings typescript \
  --wasm target/wasm32v1-none/release/public_offer.wasm \
  --output-dir "$OUTPUT_DIR" \
  --overwrite
