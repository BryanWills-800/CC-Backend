const getPrismaClientClass = () => {
    try {
        return require("@prisma/client").PrismaClient;
    } catch (error) {
        throw new Error(`Prisma client is not generated or configured: ${error.message}`);
    }
};

const getPrismaPgAdapterClass = () => {
    try {
        return require("@prisma/adapter-pg").PrismaPg;
    } catch (error) {
        throw new Error(`Prisma PostgreSQL adapter is not installed or configured: ${error.message}`);
    }
};

const getPrismaConfig = () => ({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.PRISMA_LOG_QUERIES === "true"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
});

const createPrismaClient = () => {
    const PrismaClient = getPrismaClientClass();
    const PrismaPg = getPrismaPgAdapterClass();
    const config = getPrismaConfig();

    if (!config.datasourceUrl) {
        throw new Error("DATABASE_URL is required for Prisma PostgreSQL runtime");
    }

    return new PrismaClient({
        adapter: new PrismaPg({ connectionString: config.datasourceUrl }),
        log: config.log,
    });
};

let prismaClient = null;

const getPrismaClient = () => {
    if (!prismaClient) prismaClient = createPrismaClient();
    return prismaClient;
};

const prismaConnect = async () => {
    const client = getPrismaClient();
    await client.$connect();
    console.log("Prisma connected to PostgreSQL");
    return client;
};

const prismaDisconnect = async () => {
    if (!prismaClient) return;
    await prismaClient.$disconnect();
    prismaClient = null;
};

const prismaHealthCheck = async () => {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
};

module.exports = {
    getPrismaConfig,
    getPrismaClientClass,
    getPrismaPgAdapterClass,
    createPrismaClient,
    getPrismaClient,
    prismaConnect,
    prismaDisconnect,
    prismaHealthCheck,
};
