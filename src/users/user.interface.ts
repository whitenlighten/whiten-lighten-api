import { Role } from "@prisma/client";

export interface RequestUser {userId: string, role: Role, email: string}