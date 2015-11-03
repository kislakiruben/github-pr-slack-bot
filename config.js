module.exports = {
  port:             process.env.PORT || 3000,
  webhook:          process.env.SLACK_HOOK_URL,
  channel:          process.env.SLACK_CHANNEL,
  bot:              process.env.SLACK_BOT_NAME
};
