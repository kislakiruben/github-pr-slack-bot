## _Github Pull Requests to Slack_ bot
Node app to send Github pull requests to Slack. It sends only `open` events (for now).

### Installation
1. clone repository
1. map Github usernames to Slack usernames by editing `userMapping.js`
1. deploy app to Heroku
1. configure a new Slack [incoming hook integration](https://my.slack.com/services/new/incoming-webhook)
1. use **Webhook URL** to set `SLACK_HOOK_UR` env var in your Heroku app
1. configure a new Github webhook on your repository (or organization)
  1. point the **Payload URL** to your Heroku instance
  1. set a secret (whatever you want)
  1. choose **Let me select individual events.**
  1. select **Pull requests - Pull Request opened, closed, assigned, labeled, or synchronized.**
1. go back to your Heroku app and use the secret you just defined to set `GITHUB_SECRET` env var
