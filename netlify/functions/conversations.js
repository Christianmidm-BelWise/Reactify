const { proxy } = require('./_reactify-backend');

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    return {};
  }
}

exports.handler = async function (event) {
  // Bestaande, stabiele conversations-function fungeert ook als fallback
  // voor de nieuwe e-mailacties. Zo blijft verzenden/synchroniseren werken
  // wanneer een aparte Netlify-function nog niet in de deploy aanwezig is.
  if (event.httpMethod === 'POST') {
    const body = parseBody(event);
    const action = String(body._reactifyAction || body.action || '').toLowerCase();
    if (action === 'send-message') {
      return proxy(event, '/send-message', { method: 'POST' });
    }
    if (action === 'email-sync') {
      return proxy(event, '/email/sync', { method: 'POST' });
    }
  }

  return proxy(event, '/conversations', { method: event.httpMethod });
};
