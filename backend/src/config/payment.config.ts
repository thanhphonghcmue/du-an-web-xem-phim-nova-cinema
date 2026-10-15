import { registerAs } from "@nestjs/config";
import {
  paymentOrigin,
  paymentReturnOrigins,
  requiredSecret,
} from "./environment";
export interface PaymentSettings {
  secret: string;
  baseUrl: string;
  returnOrigins: string[];
}
export default registerAs("payment", (): PaymentSettings => ({
  secret: requiredSecret(process.env, "PAYMENT_SANDBOX_SECRET"),
  baseUrl: paymentOrigin(process.env),
  returnOrigins: paymentReturnOrigins(process.env),
}));
