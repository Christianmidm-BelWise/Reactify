const { proxy } = require('./_reactify-backend');

exports.handler = async function (event) {
  return proxy(event, '/email/sync', { method: event.httpMethod === 'GET' ? 'GET' : 'POST' });
};
