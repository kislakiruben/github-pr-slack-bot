'use strict';

const bodyParser = require("body-parser");
const express = require('express');
const GitHubApi = require('github');
const Slack = require('slack-node');

const users = require('./userMapping');
const config = require('./config');

const slack = new Slack();
const github = new GitHubApi({
  version: '3.0.0',
});
const app = express();

app.use(bodyParser.json());

slack.setWebhook(config.webhook);
github.authenticate({
  type: 'oauth',
  token: config.githubApiToken
});

app.post('/', function(req, res) {
  if (req.body.pull_request && req.body.action === 'opened') {
    const fields = [];
    const pr = req.body.pull_request;
    const message = `New pull request submitted to <${pr.head.repo.html_url}|${pr.head.repo.full_name}>`;

    const authorField = {
      title: 'Opened by',
      value: mapUserToSlack(pr.user.login, users),
      short: true
    };
    fields.push(authorField);

    if (pr.assignee) {
      const assigneeField = {
        title: 'Assigned to',
        value: mapUserToSlack(pr.assignee.login, users),
        short: true
      };

      fields.push(assigneeField);
    }

    const attachment = {
      color: '#36a64f',
      text: pr.body,
      title: pr.title,
      title_link: pr.html_url,
      mrkdwn_in: [ 'text' ],
      fields: fields
    };

    slack.webhook({
      channel: config.channel,
      username: config.bot,
      text: message,
      attachments: [ attachment ]
    }, function(err, res) {
      console.log(err);
    });
  }

  res.end();
});

function mapUserToSlack(githubUserName, userMap) {
  const slackUserName = userMap[githubUserName];

  return (slackUserName) ? `<@${slackUserName}|${slackUserName}>` : githubUserName;
}

const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;

  console.log('Listening for pull requests on http://%s:%s', host, port);
});
