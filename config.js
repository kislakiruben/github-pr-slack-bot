module.exports = {
  port:             process.env.port || 3000,
  webhook:          process.env.SLACK_HOOK_URL,
  channel:          process.env.SLACK_CHANNEL,
  bot:              process.env.SLACK_BOT_NAME || 'PRbot',
  githubApiToken:   process.env.GITHUB_TOKEN
};
