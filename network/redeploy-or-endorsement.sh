#!/usr/bin/env bash
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

ROOTDIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOTDIR}/fabric-samples/test-network"

bash ./network.sh deployCC \
  -c mychannel \
  -ccn filemeta \
  -ccp "S:/chaincode/filemeta" \
  -ccl go \
  -ccv 2 \
  -ccs 2 \
  -ccep "OR('Org1MSP.peer','Org2MSP.peer')"

