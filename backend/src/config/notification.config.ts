import { registerAs } from "@nestjs/config";
import { notificationSettings } from "./notification.settings";
export default registerAs("notification", () =>
  notificationSettings(process.env),
);
