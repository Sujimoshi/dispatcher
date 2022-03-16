#! /bin/bash

OLD_RUNS=$(gh run list -w 21888251 --json databaseId -q '.[].databaseId')
echo $OLD_RUNS

CALLER=$(git config user.email)
CONFIG=`node -e "console.log(JSON.stringify({ caller: '$CALLER' }))"`

echo "Triggering deployment with '$CONFIG' config"

echo $CONFIG | gh workflow run 21888251 --json --ref master

# for i in {1..30}; do
#   echo "OLD_RUNS: $OLD_RUNS"
#   NEW_RUNS=$(gh run list -w 21888251 --json databaseId -q '.[].databaseId')
#   echo "NEW_RUNS: $NEW_RUNS"
#   DIFF_RUNS=$(for i in $NEW_RUNS; do echo $OLD_RUNS | grep -q $i || echo $i; done)
#   echo "DIFF_RUNS: $DIFF_RUNS"
#   RUN=$(for RUN_ID in ${DIFF_RUNS[@]}; do gh run watch --exit-status $RUN_ID; done)
#   echo "RUN: $RUN"
#   [[ "$RUN" != ''  ]] && break || sleep 3
# done
