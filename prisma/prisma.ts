// prisma/prisma.js
import { Prisma, PrismaClient } from '@prisma/client';

let prisma: PrismaClient<
	Prisma.PrismaClientOptions,
	never,
	Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
>;

if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient();
} else {
	/* if (!global.prisma) {
		global.prisma = new PrismaClient();
	}
	prisma = global.prisma; */
	prisma = new PrismaClient();
}

export default prisma;
