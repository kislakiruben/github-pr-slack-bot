'use strict';

const config = require('./config');
const bodyParser = require("body-parser");
const express = require('express');
const Slack = require('slack-node');
const Crypto = require('crypto');

const users = require('./userMapping');

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

    const message = `New pull request submitted to <${pr.head.repo.html_url}|${pr.head.repo.full_name}>`;
    const fallback = `New pull request ${pr.html_url}`;
    const thumb = `${req.protocol}://${req.get('host')}/icon.png`;
    const authorUser = mapUserToSlack(pr.user.login, users);

    const authorField = {
      title: 'Opened by',
      value: authorUser,
      short: true
    };

    fields.push(authorField);

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
        assigneeUsers += mapUserToSlack(assignee.login, users);
      });

      const assigneeField = {
        title: 'Assigned to',
        value: assigneeUsers,
        short: true
      };

      fields.push(assigneeField);
    }

    const attachment = {
      fallback:     fallback,
      color:        '#36a64f',
      text:         pr.body,
      title:        pr.title,
      title_link:   pr.html_url,
      mrkdwn_in:    [ 'text' ],
      fields:       fields,
      thumb_url:    thumb
    };

    slack.webhook({
      text: message,
      attachments: [ attachment ]
    }, function(err, res) {
      console.log(err);
    });

    res.end();
  } else {
    res.status(204).end();
  }
}

function mapUserToSlack(githubUserName, userMap) {
  const slackUser = userMap[githubUserName];
  const formattedSlackUser = (slackUser) ? `<@${slackUser}|${slackUser}>` : null;
  const formattedGithubUser = `<https://github.com/${githubUserName}|${githubUserName}>`;

  return formattedSlackUser || formattedGithubUser;
}

const server = app.listen(config.port, function() {
  const port = server.address().port;

  console.log(`Listening for pull requests on port ${port}`);
});
