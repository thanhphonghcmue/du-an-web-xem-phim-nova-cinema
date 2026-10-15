export interface SmtpFixture {
  port: number;
  state: {
    messages: Array<{ to: string[]; raw: string }>;
    attempts: number;
    rejectNext: number;
    stall: boolean;
  };
  close(): Promise<void>;
}
export function createSmtpFixture(): Promise<SmtpFixture>;
