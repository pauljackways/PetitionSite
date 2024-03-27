import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Logger from "../../config/logger";
import {getPool} from "../../config/db";
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
        if (!token) {
            return false;
        }
        const secretKey = process.env.SENG365_JWT_KEY || "NoKeyInENV";
        return jwt.verify(token, secretKey);
    } catch (err) {
        Logger.http(`failed at Decoding session token`);
        throw new Error(err.message);
    }
}

const checkToken = async (reqId: string, userToken: string): Promise<boolean> => {
    Logger.http(`checking token ${userToken}`)
    try {
        const id = await decodeToken(userToken);
        if (reqId !== id) {
            return false;
        }
        const conn = await getPool().getConnection();
        const getQuery = 'select auth_token from user where id = ?';
        const [ databaseToken ] = await conn.query( getQuery, [ id ] );
        if (!(databaseToken.length > 0)) {
            return false;
        }
        return databaseToken[0].auth_token === userToken;
    } catch (err) {
        Logger.error(err);
    }
}

export { createToken, decodeToken, checkToken };