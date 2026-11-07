import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
@Injectable()
export class EmailLogsRepository {
  constructor(private readonly prisma: PrismaService) {}
  enqueue(
    data: Prisma.EmailLogUncheckedCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.emailLog.upsert({
      where: { eventId: data.eventId },
      create: data,
      update: {},
    });
  }
  byTicket(ticketId: string) {
    return this.prisma.emailLog.findFirst({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
    });
  }
  find(id: string) {
    return this.prisma.emailLog.findUnique({ where: { id } });
  }
  attempted(eventId: string, attempts: number) {
    return this.prisma.emailLog.updateMany({
      where: { eventId, deliveryStatus: { not: "SMTP_ACCEPTED" } },
      data: { attempts },
    });
  }
  accepted(eventId: string, acceptedAt: Date, tx: Prisma.TransactionClient) {
    return tx.emailLog.updateMany({
      where: { eventId },
      data: {
        deliveryStatus: "SMTP_ACCEPTED",
        acceptedAt,
        lastErrorCode: null,
      },
    });
  }
  retry(eventId: string, tx: Prisma.TransactionClient) {
    return tx.emailLog.updateMany({
      where: { eventId, deliveryStatus: { not: "SMTP_ACCEPTED" } },
      data: {
        deliveryStatus: "RETRYING",
        lastErrorCode: "EMAIL_DELIVERY_FAILED",
      },
    });
  }
}
