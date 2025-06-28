import dotenv from "dotenv"

dotenv.config()

interface Config {
    PORT: number;
    NodeEnv: string;
    Origin: string;
    DEFAULT_SPACE_ID: string;
}

export const config: Config = {
    PORT: Number(process.env.PORT) || 6000,
    NodeEnv: process.env.MODE || "development",
    Origin: process.env.MODE === "development" ? "http://localhost:3000" : "https://2dverse.vercel.app",
    DEFAULT_SPACE_ID: process.env.DEFAULT_SPACE_ID!
}