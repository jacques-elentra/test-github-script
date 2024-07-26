/**
 * The GitHub build configuration
 */
const build = require(`${process.env.GITHUB_WORKSPACE}/.github/workflows/build.json`);

/**
 * Define an initial mapping of references
 */
let refs = build['elentra-1x-me'].map(ref => ({ me_ref: ref, me_branch: ref }));

/**
 * Generate the testing matrix
 *
 * @returns {Promise<Array>}
 */
module.exports = async ({ github, context, core }) => {

    // console.log({ repo: context.repo });
    // console.log(context.repo);
    // console.log(JSON.stringify(context, null, 2));
    // console.log(context.constructor.name);

    /**
     * The GitHub repository object
     */
    // const { repo } = context;
    // console.log({ github, context, core, repo });

    // const repo = { owner: 'jacques-elentra', repo: 'test-github-script' }
    const repo = { owner: 'ElentraProject', repo: 'elentra-1x-me' }

    /**
     * Parse the Jira ticket info from the branch name
     *
     * feature/develop/ME-1234-my-feature
     *  [type..] feature|hotfix
     *  [base..] develop|1.23|6.x
     *  [parent]
     *  [issue.] ME-1234
     *  [desc..] my-feature
     *
     * feature/ME-1234-my-feature
     *  [type..] feature|hotfix
     *  [base..]
     *  [parent]
     *  [issue.] ME-1234
     *  [desc..] my-feature
     *
     * feature/develop/ME-1234/ME-2341-my-subtask
     *  [type..] feature|hotfix
     *  [base..] develop|1.23|6.x
     *  [parent] ME-1234
     *  [issue.] ME-2341
     *  [desc..] my-subtask
     *
     * @param {string} branch
     *
     * @throws
     * @returns {object}
     */
    function parseJiraIssue(branch) {
        const regex = /(feature|hotfix)\/?([a-z]+|\d.[\dx]+)?\/?([A-Z]+-[0-9]+)?\/([A-Z]+-[0-9]+)-([\w-]+)/;

        // Parse out Jira information from the branch name
        const [_, type, base, parent, issue, desc] = branch.match(regex);

        if (base) {
            core.info(`Base Branch: ${base}`);
        }

        core.info(`Issue Type: ${type}`);
        core.info(`Description: ${desc.replace(/-/g, ' ')}`);

        if (issue) {
            core.info(`Jira Issue: https://elentra.atlassian.net/browse/${issue}`);
        }

        return { parent, issue };
    }

    /**
     * Attempt to fetch the companion pull request
     *
     * @param {string} jira_issue
     *
     * @throws
     * @returns {Promise<object|null>}
     */
    async function fetchPullRequest(jira_issue) {
        const { data } = await github.rest.search.issuesAndPullRequests({
            q: `type:pr+state:open+repo:${repo.owner}/elentra-1x-me+${jira_issue}+in:title`
        });

        if (!data || !data.items.length) {
            return null; // No results
        }

        let pull_request = null;

        for (let i = 0; i < data.items.length; i++) {
            let pr = await github.rest.pulls.get({
                owner: repo.owner,
                repo: 'elentra-1x-me',
                pull_number: data.items[i].number
            });

            // Use the PR if the branch name matches exactly or the first returned
            if (pr.data.head.ref == process.env.GITHUB_HEAD_REF || i == 0) {
                pull_request = pr.data;
            }
        }

        return pull_request;
    }

   /**
    * Generate the build matrix
    *
    * @param {object} build
    * @param {Array}  refs
    *
    * @returns {Array}
    */
    const generateMatrix = (build, refs) => build.php.reduce((matrix, { version: php, experimental }) => [
        ...matrix, ...refs.map(({ me_ref, me_branch }) => ({ php, experimental, me_ref, me_branch }))
    ], []);

    /**
     * The Jira issue key. Usually formatted like ME-1234 or API-1234
     */
    let issue, parent;

    /**
     * The companion pull request required to test the changes against
     */
    let pull_request;

    console.log({ FOO: process.env.GITHUB_HEAD_REF });
    console.log({ env: process.env });

    try {
        ;({ parent, issue } = parseJiraIssue(process.env.GITHUB_HEAD_REF));
    } catch (e) {
        core.warning(`Unable to parse Jira issue from branch name, format must be (feature|hotfix)/[base]/[parent]/<Jira Issue>-<Short Description>`);
    }

    if (issue) {
        try {
            pull_request = await fetchPullRequest(issue);

            if (!pull_request && parent) {
                core.warning(`Unable to find matching pull request for ${issue}, trying parent ${parent}`);
                pull_request = await fetchPullRequest(parent);
            }
        } catch (e) {
            core.error(`Unable to connect to ${repo.owner}/elentra-1x-me`);
            core.info(e);
        }
    }

    if (pull_request) {
        core.notice(`Found ME pull request ${pull_request.html_url}`);
    } else {
        core.notice(`No matching ME pull requests found`);
    }

    return generateMatrix(
        build, pull_request ? [{ me_ref: pull_request.head.sha, me_branch: pull_request.head.ref }] : refs
    );
};
