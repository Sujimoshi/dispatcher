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
    const { data: { workflow_runs } } = await octokit.rest.actions.listWorkflowRuns({
      owner, repo, branch: ref, workflow_id: workflow, event: 'workflow_dispatch'
    })
    return workflow_runs
  }

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // list workflows
  const existedRuns = await listWorkflowRuns()

  const findRun = async () => {
    const attempts = 100
    for (let i = 0; i < attempts; i++) {
      await sleep(3000)
      const runs = await listWorkflowRuns()

      const newRuns = runs.filter(run => !existedRuns.find(existedRun => existedRun.id === run.id))
      
      if (newRuns.length === 0) continue
    
      for (const run of newRuns) {
        const { data: { jobs } } = await octokit.rest.actions.listJobsForWorkflowRun({
          owner, repo, run_id: run.id, filter: 'latest'
        })

        const job = jobs.find(({ name, steps }) => name.includes(marker) || steps.find(({ name }) => name.includes(marker)))

        if (job) return run
      }
    }
  }

  // dispatch run
  await octokit.rest.actions.createWorkflowDispatch({
    owner, repo, ref, workflow_id: workflow,
    inputs: { 
      ...Object.entries(payload).reduce((acc, [key, value]) => ({ ...acc, [key]: JSON.stringify(value) }), {}),
      [marker_input_name]: marker
    }
  })

  const run = await findRun()

  console.log(desiredRun)
})().catch(err => {
  console.error(err)
  core.setFailed(err.message)
})
