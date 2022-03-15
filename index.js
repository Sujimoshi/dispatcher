const core = require('@actions/core');
const github = require('@actions/github');

;(async function() {
  const owner = core.getInput('owner');
  const repo = core.getInput('repo');
  const ref = core.getInput('ref');
  const workflow = core.getInput('workflow');
  const token = core.getInput('token');
  const payload = JSON.parse(core.getInput('payload') || '{}');
  const marker_input_name = core.getInput('marker_input_name') || 'caller'
  const marker = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`

  const octokit = github.getOctokit(token);

  const listWorkflowRuns = async () => {
    return octokit.rest.actions.listWorkflowRuns({
      owner, repo, branch: ref, workflow_id: workflow, event: 'workflow_dispatch'
    }).then(({ data: { workflow_runs } }) => workflow_runs).catch(err => ([]))
  }

  const getWorkflowRun = async (id) => {
    return octokit.rest.actions.getWorkflowRun({ owner, repo, run_id: id })
      .then(({ data }) => data).catch(err => ({}))
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // list workflows
  const existedRuns = await listWorkflowRuns()

  const listJobsForWorkflowRun = async (runId) => {
    return octokit.rest.actions.listJobsForWorkflowRun({
      owner, repo, run_id: runId
    }).then(({ data: { jobs } }) => jobs).catch(err => ([]))
  }

  const findWorkflowRunByMarker = async (marker) => {
    const attempts = 100
    for (let i = 0; i < attempts; i++) {
      await sleep(3000)
      const runs = await listWorkflowRuns()

      const newRuns = runs.filter(run => !existedRuns.find(existedRun => existedRun.id === run.id))
      
      if (newRuns.length === 0) continue
      
      for (const run of newRuns) {
        const jobs = await listJobsForWorkflowRun(run.id)

        const job = jobs.find(({ name, steps }) => name.includes(marker) || steps.find(({ name }) => name.includes(marker)))

        if (job) return run
      }
    }
  }

  const inputs = { 
    ...Object.entries(payload).reduce((acc, [key, value]) => ({ ...acc, [key]: JSON.stringify(value) }), {}),
    [marker_input_name]: marker
  }

  await octokit.rest.actions.createWorkflowDispatch({ owner, repo, ref, workflow_id: workflow, inputs })

  let run = await findWorkflowRunByMarker(marker)

  console.log(`Waiting for completion of ${run.html_url} with inputs:`, inputs)

  while (run.status !== 'completed') {
    await sleep(5000)
    run = await getWorkflowRun(run.id)

    const jobs = await listJobsForWorkflowRun(run.id)
  }

  if (run.conclusion !== 'success') {
    core.setFailed(`Triggered workflow run failed`)
  } else {
    console.log(`Triggered workflow run ${run.conclusion}ed`)
  }
})().catch(err => {
  console.error(err)
  core.setFailed(err.message)
})
