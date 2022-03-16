#!/bin/sh -l

REPO="$INPUT_OWNER/$INPUT_REPO"
REF="$INPUT_REF"
WORKFLOW="$INPUT_WORKFLOW"
PAYLOAD="$INPUT_PAYLOAD"
MARKER="$INPUT_MARKER_INPUT_NAME"
CALLER="https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"

export GH_TOKEN="$INPUT_TOKEN"

OLD_RUNS=$(gh run list -w $WORKFLOW -R $REPO --json databaseId -q '.[].databaseId')

CONFIG=`node -e "console.log(JSON.stringify({ 
  ...Object.entries($PAYLOAD).reduce((acc, [key, value]) => ({ 
    ...acc, [key]: typeof value !== 'string' ? JSON.stringify(value) : value 
  }), {}),
  '$MARKER': '$CALLER'
}))"`

echo $CONFIG | gh workflow run $WORKFLOW --json --ref $REF -R $REPO

for i in {1..30}; do
  NEW_RUNS=$(gh run list -w $WORKFLOW -R $REPO --json databaseId -q '.[].databaseId')
  DIFF_RUNS=$(for i in $NEW_RUNS; do echo $OLD_RUNS | grep -q $i || echo $i; done)
  echo "DIFF_RUNS: '$DIFF_RUNS'"
  RUN=$(for RUN_ID in $DIFF_RUNS; do gh run view $RUN_ID -R $REPO -v | grep -q $CALLER && echo $RUN_ID; done)
  echo "RUN: '$DIFF_RUNS' '$([[ "$RUN" != ''  ]] && echo 'break' || echo 'sleep')'"
  [[ "$RUN" != ''  ]] && break || sleep 3
done

echo "Watching for https://github.com/$REPO/actions/runs/$RUN"

gh run watch -R $REPO --exit-status $RUN