import { Injectable, OnModuleInit } from "@nestjs/common";
import { argon2id, hash, verify } from "argon2";
import { randomBytes } from "node:crypto";
@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash!: string;
  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(32).toString("hex"));
  }
  hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  async verify(stored: string | undefined, password: string): Promise<boolean> {
    try {
      return await verify(stored || this.dummyHash, password);
    } catch {
      return false;
    }
  }
}
