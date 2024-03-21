import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Logger from "../../config/logger";
import {error} from "winston";
dotenv.config();


const createToken = (payload: string) => {
    Logger.http(`Generating session token`);
    try {
        const secretKey = process.env.SENG365_JWT_KEY || "NoKeyInENV";
        const newToken = jwt.sign(payload, secretKey);
        Logger.http(`payload ${payload}`);
        Logger.info(`token ${newToken}`);
        return newToken;
    } catch (err) {
        throw new Error(err.message);
    }
}

const decodeToken = async (token: string): Promise<null | any> => {
    Logger.http(`Decoding session token`);
    try {
        const secretKey = process.env.SENG365_JWT_KEY || "NoKeyInENV";
        return jwt.verify(token, secretKey);
    } catch (err) {
        Logger.http(`failed at Decoding session token`);
        throw new Error(err.message);
    }
}

export { createToken, decodeToken };