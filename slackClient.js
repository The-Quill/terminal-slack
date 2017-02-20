const request = require('request');
const WebSocket = require('ws');

let channels = {};

const TOKEN = process.env.SLACK_TOKEN;

if (TOKEN === undefined) {
  const throwError = 'Error: SLACK_TOKEN undefined. Please add SLACK_TOKEN to the environment variables.';
  throw throwError;
}

// makes a request to slack. Adds token to query
function slackRequest(endpoint, query, callback) {
  const qs = query;
  qs.token = TOKEN;
  request.get({
    url: `https://slack.com/api/${endpoint}`,
    qs,
  }, (error, response, data) => {
    if (error) {
      throw error;
    }

    if (response.statusCode !== 200) {
      const logError = `Response Error: ${response.statusCode}`;
      throw logError;
    }

    const parsedData = JSON.parse(data);
    // name_taken is expected if trying to channels.join on a group
    if (!parsedData.ok && !(endpoint === 'channels.join' && parsedData.error === 'name_taken')) {
      const logError = `Error: ${parsedData.error}`;
      throw logError;
    }

    if (callback) {
      callback(error, response, data);
    }
  });
}

module.exports = {
  init(callback) {
    slackRequest('rtm.start', {}, (error, response, data) => {
      const parsedData = JSON.parse(data);
      const ws = new WebSocket(parsedData.url);
      callback(parsedData, ws);
    });
  },
  getChannels(callback) {
    slackRequest('channels.list', {}, (error, response, data) => {
      if (callback) {
        const parsedData = JSON.parse(data);
        slackRequest('groups.list', {}, (groupError, groupResponse, groupData) => {
          const groupsData = JSON.parse(groupData);
          channels = parsedData.channels.concat(groupsData.groups);
          callback(error, response, JSON.stringify({ channels }));
        });
      }
    });
  },
  joinChannel(name, callback) {
    if (callback) {
      channels.forEach((channel) => {
        if (channel.name === name) {
          callback({}, {}, JSON.stringify({ channel }));
        }
      });
    }
  },
  getChannelHistory(id, callback) {
    const endpoint = id.startsWith('G') ? 'groups.history' : 'channels.history';

    slackRequest(endpoint, {
      channel: id,
    }, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
  markChannel(id, timestamp, callback) {
    const endpoint = id.startsWith('G') ? 'groups.mark' : 'channels.mark';

    slackRequest(endpoint, {
      channel: id,
      ts: timestamp,
    }, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
  getUsers(callback) {
    slackRequest('users.list', {}, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
  openIm(id, callback) {
    slackRequest('im.open', {
      user: id,
    }, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
  getImHistory(id, callback) {
    slackRequest('im.history', {
      channel: id,
    }, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
  markIm(id, timestamp, callback) {
    slackRequest('im.mark', {
      channel: id,
      ts: timestamp,
    }, (error, response, data) => {
      if (callback) {
        callback(error, response, data);
      }
    });
  },
};
