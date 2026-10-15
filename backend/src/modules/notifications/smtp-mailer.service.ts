import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createConnection, isIP, Socket } from "node:net";
import { connect, TLSSocket } from "node:tls";
import { createTransport, SendMailOptions } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { NotificationSettings } from "../../config/notification.settings";
@Injectable()
export class SmtpMailer {
  private readonly settings: NotificationSettings;
  constructor(config: ConfigService) {
    this.settings = config.getOrThrow<NotificationSettings>("notification");
  }
  async send(message: SendMailOptions): Promise<void> {
    const settings = this.settings;
    let socket: Socket | TLSSocket | undefined;
    // Own the actual connection so the absolute deadline closes even a continuously responsive SMTP peer.
    const timer = setTimeout(() => {
      socket?.destroy(new Error("SMTP delivery deadline exceeded."));
    }, settings.timeoutMs);
    const options: SMTPTransport.Options = {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      requireTLS:
        !settings.secure &&
        !["localhost", "127.0.0.1", "::1"].includes(settings.host),
      ...(settings.user && settings.password
        ? { auth: { user: settings.user, pass: settings.password } }
        : {}),
      connectionTimeout: settings.timeoutMs,
      greetingTimeout: settings.timeoutMs,
      socketTimeout: settings.timeoutMs,
      logger: false,
      debug: false,
      getSocket: (_options, callback) => {
        const connection = settings.secure
          ? connect({
              host: settings.host,
              port: settings.port,
              ...(isIP(settings.host) ? {} : { servername: settings.host }),
              rejectUnauthorized: true,
            })
          : createConnection({ host: settings.host, port: settings.port });
        socket = connection;
        let settled = false;
        connection.once("error", (error: Error) => {
          if (!settled) {
            settled = true;
            callback(error, { connection });
          }
        });
        connection.once(settings.secure ? "secureConnect" : "connect", () => {
          if (!settled) {
            settled = true;
            callback(null, { connection, secured: settings.secure });
          }
        });
      },
    };
    const transport = createTransport(options);
    try {
      const result = await transport.sendMail({
        ...message,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (result.rejected.length || !result.accepted.length)
        throw new Error("SMTP did not accept the ticket recipient.");
    } finally {
      clearTimeout(timer);
      socket?.destroy();
      transport.close();
    }
  }
}
