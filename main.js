'use strict';

const config = require('./config');
const bodyParser = require("body-parser");
const express = require('express');
const Slack = require('slack-node');
const Crypto = require('crypto');

const slackUsers = require('./userMapping');

if (!config.webhook) {
  console.log(`Set the SLACK_HOOK_URL environment variable. Exiting...`);
  process.exit(0);
  return;
}

const slack = new Slack();
const app = express();

slack.setWebhook(config.webhook);
app.use(bodyParser.json());
app.use(express.static('static'));
app.post('/', processPayload);

function processPayload(req, res) {
  if (!config.githubSecret) {
    res.status(500).send(`Set the GITHUB_SECRET environment variable.`);
    return;
  }

  const remoteSignature = req.get('X-Hub-Signature');
  const payload = req.body;
  const hmac = Crypto.createHmac('sha1', config.githubSecret).update(JSON.stringify(payload));
  const localSignature = `sha1=${hmac.digest('hex')}`;

  if (localSignature !== remoteSignature) {
    res.status(401).send(`Signatures didn't match! Make sure the Github secret is correct.`);
    return;
  }

  if (payload.pull_request && payload.action === 'opened') {
    const fields = [];
    const pr = payload.pull_request;

    fields.push({
      title: 'Opened by',
      value: mapGithubUserToSlack(pr.user.login),
      short: true,
    });

    if (pr.assignees && pr.assignees.length > 0) {
      let assigneeUsers = '';

      pr.assignees.forEach(function(assignee, index) {
        if (index > 0) {
          if (index === pr.assignees.length - 1) {
            assigneeUsers += ' and ';
          } else {
            assigneeUsers += ', ';
          }
        }
        assigneeUsers += mapGithubUserToSlack(assignee.login);
      });

      fields.push({
        title: 'Assigned to',
        value: assigneeUsers,
        short: true,
      });
    }

    if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
      let reviewers = '';

      pr.requested_reviewers.forEach(function(reviewer, index) {
        if (index > 0) {
          if (index === pr.requested_reviewers.length - 1) {
            reviewers += ' and ';
          } else {
            reviewers += ', ';
          }
        }
        reviewers += mapGithubUserToSlack(reviewer.login);
      });

      fields.push({
        title: 'Reviewers',
        value: reviewers,
        short: true,
      });
    }

    slack.webhook({
      text: `New pull request submitted to <${pr.head.repo.html_url}|${pr.head.repo.full_name}>`,
      attachments: [
        {
          fallback:     `New pull request ${pr.html_url}`,
          color:        '#36a64f',
          text:         pr.body,
          title:        pr.title,
          title_link:   pr.html_url,
          mrkdwn_in:    [ 'text' ],
          fields:       fields,
          thumb_url:    `${req.protocol}://${req.get('host')}/icon.png`,
        },
      ],
    }, function(err, res) {
      console.log(err);
    });

    res.end();
  } else {
    res.status(204).end();
  }
}

function mapGithubUserToSlack(githubUserName) {
  const slackUser = slackUsers[githubUserName];

  return slackUser ? `<@${slackUser}>` : `<https://github.com/${githubUserName}|${githubUserName}>`;
}

const server = app.listen(config.port, function() {
  const port = server.address().port;

  console.log(`Listening for pull requests on port ${port}`);
});
