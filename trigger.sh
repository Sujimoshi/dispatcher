#!/bin/sh -l

REPO="$INPUT_OWNER/$INPUT_REPO"
REF="$INPUT_REF"
WORKFLOW="$INPUT_WORKFLOW"
PAYLOAD="$INPUT_PAYLOAD"
MARKER="$INPUT_MARKER_INPUT_NAME"
CALLER="https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"

export GH_TOKEN="$INPUT_TOKEN"

OLD_RUNS=`gh run list -w "$WORKFLOW" -R "$REPO" --json databaseId -q '.[].databaseId'`

CONFIG=`node -e "console.log(JSON.stringify({ 
  ...Object.entries($PAYLOAD).reduce((acc, [key, value]) => ({ 
    ...acc, [key]: typeof value !== 'string' ? JSON.stringify(value) : value 
  }), {}),
  '$MARKER': '$CALLER'
}))"`

echo "$CONFIG" | gh workflow run "$WORKFLOW" --json --ref "$REF" -R "$REPO"

for i in `seq 1 30`; do
  NEW_RUNS=$(gh run list -w $WORKFLOW -R $REPO --json databaseId -q '.[].databaseId')
  DIFF_RUNS=`for RID in $NEW_RUNS; do echo $OLD_RUNS | grep -q $RID || echo $RID; done`
  RUN=`for RUN_ID in $DIFF_RUNS; do gh run view "$RUN_ID" -R "$REPO" -v | grep -q "$CALLER" && echo "$RUN_ID"; done`
  [[ "$RUN" != ''  ]] && break || sleep 5
done

echo -e "\nWatching for https://github.com/$REPO/actions/runs/$RUN\n"

gh run watch -R "$REPO" --exit-status "$RUN" > /dev/null
