const { proxy } = require("./_reactify-backend");
exports.handler = async function(event) {
  return proxy(event, "/conversation-messages", { method: "GET" });
};
