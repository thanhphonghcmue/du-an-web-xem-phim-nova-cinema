import { HttpException, Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Socket } from "socket.io";
import { ApiException } from "../common/exceptions/api.exception";
import { JoinShowtimeDto } from "../modules/showtime-seats/showtime-seats.dto";
import { ShowtimeSeatsService } from "../modules/showtime-seats/showtime-seats.service";
import { SeatSocketPolicy } from "./seat-socket-policy.service";
@Injectable()
export class SeatSubscriptionsService {
  private readonly pending = new WeakMap<Socket, Promise<unknown>>();
  constructor(
    private readonly policy: SeatSocketPolicy,
    private readonly seats: ShowtimeSeatsService,
  ) {}
  async handle(client: Socket, body: unknown, join: boolean): Promise<unknown> {
    try {
      await this.policy.message(client.handshake.address);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new ApiException(
          400,
          "VALIDATION_ERROR",
          "Provide a valid showtimeId UUID only.",
        );
      const dto = plainToInstance(JoinShowtimeDto, body);
      if (
        validateSync(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
          forbidUnknownValues: true,
        }).length
      )
        throw new ApiException(
          400,
          "VALIDATION_ERROR",
          "Provide a valid showtimeId UUID only.",
        );
      const previous = this.pending.get(client) ?? Promise.resolve();
      const operation = previous
        .catch(() => undefined)
        .then(async () => {
          requireConnected(client);
          const room = `showtime:${dto.showtimeId}`;
          if (join) {
            await this.seats.requireShowtime(dto.showtimeId);
            requireConnected(client);
            for (const oldRoom of client.rooms)
              if (oldRoom.startsWith("showtime:") && oldRoom !== room)
                await client.leave(oldRoom);
            await client.join(room);
          } else await client.leave(room);
          return {
            success: true,
            data: { showtimeId: dto.showtimeId, room, joined: join },
          };
        });
      this.pending.set(client, operation);
      return await operation;
    } catch (error) {
      if (error instanceof ApiException) {
        const payload = error.getResponse() as {
          error: string;
          message: string;
        };
        return {
          success: false,
          error: payload.error,
          message:
            error.getStatus() >= 500
              ? "Seat subscription is temporarily unavailable."
              : payload.message,
        };
      }
      return {
        success: false,
        error:
          error instanceof HttpException
            ? "VALIDATION_ERROR"
            : "INTERNAL_ERROR",
        message: "Seat subscription failed.",
      };
    }
  }
}
function requireConnected(client: Socket): void {
  if (!client.connected)
    throw new ApiException(409, "SOCKET_CLOSED", "Socket is closed.");
}
