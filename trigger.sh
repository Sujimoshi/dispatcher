#!/bin/sh -l

env

REPO="$1"
REF="$2"
TOKEN="$3"
WORKFLOW="$4"
PAYLOAD="$5"
MARKER="$6"
CALLER="https://github.com/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"

export GH_TOKEN="$TOKEN"

OLD_RUNS=$(gh run list -w $WORKFLOW -R $REPO --json databaseId -q '.[].databaseId')

CONFIG=`node -e "console.log(JSON.stringify({ 
  ...Object.entries($PAYLOAD).reduce((acc, [key, value]) => ({ 
    ...acc, [key]: typeof value !== 'string' ? JSON.stringify(value) : value 
  }), {}),
  ['$MARKER']: marker
}))"`

echo $CONFIG | gh workflow run $WORKFLOW --json --ref $REF -R $REPO

for i in {1..30}; do
  NEW_RUNS=$(gh run list -w $WORKFLOW -R $REPO --json databaseId -q '.[].databaseId')
  DIFF_RUNS=$(for i in $NEW_RUNS; do echo $OLD_RUNS | grep -q $i || echo $i; done)
  RUN=$(for RUN_ID in $DIFF_RUNS; do gh run view $RUN_ID -R $REPO -v | grep -q $CALLER && echo $RUN_ID; done)
  [[ "$RUN" != ''  ]] && break || sleep 3
done

echo "Watching for https://github.com/$REPO/actions/runs/$RUN"

gh run watch -R $REPO --exit-status $RUN