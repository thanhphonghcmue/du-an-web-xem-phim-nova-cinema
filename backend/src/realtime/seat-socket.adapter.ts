import { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions } from "socket.io";
import { SeatSocketPolicy } from "./seat-socket-policy.service";
export class SeatSocketAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly policy: SeatSocketPolicy,
  ) {
    super(app);
  }
  override createIOServer(
    port: number,
    options: Partial<ServerOptions> = {},
  ): Server {
    return super.createIOServer(port, {
      ...options,
      transports: ["websocket"],
      maxHttpBufferSize: 16384,
      cors: { origin: this.policy.origins, credentials: false },
      allowRequest: (request, callback) => {
        void this.policy
          .connect(
            request.headers.origin,
            request.socket.remoteAddress ?? "unknown",
          )
          .then(
            () => {
              callback(null, true);
            },
            () => {
              callback("Seat connection denied.", false);
            },
          );
      },
    } satisfies Partial<ServerOptions>) as Server;
  }
}
