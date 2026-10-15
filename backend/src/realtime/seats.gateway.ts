import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { SkipThrottle } from "@nestjs/throttler";
import { Namespace, Socket } from "socket.io";
import { Public } from "../common/decorators/public.decorator";
import { SeatEventsBus } from "./seat-events.bus";
import { SeatSubscriptionsService } from "./seat-subscriptions.service";
@Public()
@SkipThrottle()
@WebSocketGateway({ namespace: "/seats", transports: ["websocket"] })
export class SeatsGateway implements OnGatewayInit<Namespace> {
  @WebSocketServer() namespace!: Namespace;
  constructor(
    private readonly bus: SeatEventsBus,
    private readonly subscriptions: SeatSubscriptionsService,
  ) {}
  afterInit(namespace: Namespace): void {
    this.bus.attach(namespace);
  }
  @SubscribeMessage("join_showtime") join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    return this.subscriptions.handle(client, body, true);
  }
  @SubscribeMessage("leave_showtime") leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    return this.subscriptions.handle(client, body, false);
  }
}
