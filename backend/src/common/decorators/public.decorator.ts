import { SetMetadata } from "@nestjs/common";
export const IS_PUBLIC = "nova:public";
export const Public = () => SetMetadata(IS_PUBLIC, true);
