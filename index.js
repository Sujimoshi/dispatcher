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

  const octokit = github.getOctokit(token);

  const listWorkflowRuns = async () => {
    const { data: { workflow_runs } } = await octokit.rest.actions.listWorkflowRuns({
      owner, repo, branch: ref, workflow_id: workflow, event: 'workflow_dispatch'
    })
    return workflow_runs
  }

  const existedRuns = await listWorkflowRuns()

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  await octokit.rest.actions.createWorkflowDispatch({
    owner, repo, ref, workflow_id: workflow,
    inputs: { 
      [marker_input_name]: `https://github.com/${github.context.owner}/${github.context.repo}/actions/runs/${github.context.runId}`,
      ...Object.entries(payload).reduce((acc, [key, value]) => ({ ...acc, [key]: JSON.stringify(value) }), {})
    }
  })

  const attempts = 30
  for (let i = 0; i < attempts; i++) {
    const runs = await listWorkflowRuns()

    const newRuns = workflow_runs.filter(run => !existedRuns.find(existedRun => existedRun.id === run.id))
    
    if (newRuns.length === 0) {
      sleep(1000)
      continue
    }

    console.log(newRuns)
  
    for (const run of newRuns) {
      const { data: { jobs } } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner, repo, run_id: run.id, filter: 'latest'
      })

      console.log(jobs)
  
      for (const job of jobs) {
        console.log(job.name, job.steps)
      }
    }
  }

})().catch(err => core.setFailed(err.message))
