const { createServer } = require("node:net");
async function createSmtpFixture() {
  const connections = new Set();
  const state = { messages: [], attempts: 0, rejectNext: 0, stall: false };
  const server = createServer((socket) => {
    connections.add(socket);
    socket.on("error", () => {});
    socket.once("close", () => connections.delete(socket));
    socket.setEncoding("utf8");
    socket.write("220 localhost NOVA test SMTP\r\n");
    let pending = "";
    let inData = false;
    let raw = [];
    let recipients = [];
    socket.on("data", (chunk) => {
      pending += chunk;
      let end;
      while ((end = pending.indexOf("\r\n")) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (inData) {
          if (line !== ".") {
            raw.push(line.startsWith("..") ? line.slice(1) : line);
            continue;
          }
          inData = false;
          state.attempts++;
          if (state.stall) continue;
          if (state.rejectNext > 0) {
            state.rejectNext--;
            socket.write("451 Temporary delivery failure\r\n");
          } else {
            state.messages.push({ to: [...recipients], raw: raw.join("\r\n") });
            socket.write("250 Message accepted\r\n");
          }
          continue;
        }
        if (/^(EHLO|HELO)\b/i.test(line))
          socket.write("250-localhost\r\n250 8BITMIME\r\n");
        else if (/^MAIL FROM:/i.test(line)) {
          recipients = [];
          socket.write("250 Sender accepted\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line.slice(8).trim().replace(/^<|>$/g, ""));
          socket.write("250 Recipient accepted\r\n");
        } else if (/^DATA$/i.test(line)) {
          inData = true;
          raw = [];
          socket.write("354 End with dot\r\n");
        } else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
        else if (/^(RSET|NOOP)\b/i.test(line)) socket.write("250 OK\r\n");
        else socket.write("502 Command unsupported\r\n");
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    state,
    port: server.address().port,
    async close() {
      for (const socket of connections) socket.destroy();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
module.exports = { createSmtpFixture };
