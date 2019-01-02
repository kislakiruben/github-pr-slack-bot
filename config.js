module.exports = {
  port:             process.env.PORT || 3000,
  webhook:          process.env.SLACK_HOOK_URL,
  githubSecret:     process.env.GITHUB_SECRET,
};
