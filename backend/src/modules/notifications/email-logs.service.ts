import { Injectable } from "@nestjs/common";
import { ApiException } from "../../common/exceptions/api.exception";
import { EmailLogsRepository } from "./email-logs.repository";
@Injectable()
export class EmailLogsService {
  constructor(private readonly logs: EmailLogsRepository) {}
  async adminPreview(id: string) {
    const log = await this.logs.find(id);
    if (!log)
      throw new ApiException(
        404,
        "EMAIL_LOG_NOT_FOUND",
        "Không tìm thấy nhật ký email.",
      );
    return {
      subject: log.subject,
      to: log.recipient,
      // Admin đối soát nội dung; QR riêng của khách vẫn ở endpoint owner-only.
      html: log.html.replace(
        /<img[^>]*src="cid:nova-ticket-qr"[^>]*>/,
        "<p>Mã QR riêng được hiển thị trên vé của chủ sở hữu.</p>",
      ),
      deliveryStatus: log.deliveryStatus,
      acceptedAt: log.acceptedAt,
      attempts: log.attempts,
    };
  }
}
