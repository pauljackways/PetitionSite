import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { compare } from '../services/passwords';
import {createToken, decodeToken} from "../services/session";

const getImage = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    try {
        Logger.info(`Adding user ${firstName} ${lastName} to the database`);
        const conn = await getPool().getConnection();
        const query = 'select image_filename user (email, first_name, last_name, password) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [ email, firstName, lastName, password ] );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}

const setImage = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    try {
        Logger.info(`Adding user ${firstName} ${lastName} to the database`);
        const conn = await getPool().getConnection();
        const query = 'insert into user (email, first_name, last_name, password) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [ email, firstName, lastName, password ] );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}

const deleteImage = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    try {
        Logger.info(`Adding user ${firstName} ${lastName} to the database`);
        const conn = await getPool().getConnection();
        const query = 'insert into user (email, first_name, last_name, password) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [ email, firstName, lastName, password ] );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}


export {getImage, setImage, deleteImage}