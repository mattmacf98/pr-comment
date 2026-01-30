import * as core from '@actions/core'
import { getOctokit } from '@actions/github'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const prNumber = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })

    const octokit = getOctokit(token)

    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10)
    })

    let diffData = {
      additions: 0,
      deletions: 0,
      changes: 0
    }

    diffData = changedFiles.reduce((acc, file) => {
      acc.additions += file.additions
      acc.deletions += file.deletions
      acc.changes += file.changes
      return acc
    }, diffData)

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(prNumber, 10),
      body: `This PR contains ${diffData.additions} additions, ${diffData.deletions} deletions, and ${diffData.changes} changes.`
    })

    const labels = new Set<string>()
    for (const file of changedFiles) {
      const fileExtension = file.filename.split('.').pop()
      switch (fileExtension) {
        case 'js':
          labels.add('javascript')
          break
        case 'ts':
          labels.add('typescript')
          break
        default:
          labels.add('other')
          break
      }
    }

    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: parseInt(prNumber, 10),
      labels: Array.from(labels)
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
