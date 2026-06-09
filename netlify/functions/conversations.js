const { proxy } = require("./_reactify-backend");

exports.handler = async function(event) {
  return proxy(event, "/conversations", { method: event.httpMethod });
};
