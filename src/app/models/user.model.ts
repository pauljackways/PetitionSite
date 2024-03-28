import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { compare } from '../services/passwords';
import {createToken, checkToken} from "../services/session";

const registerUser = async (body: any, password: string): Promise<ResultSetHeader> => {
    try {
        Logger.info(`Adding user ${body.firstName} ${body.lastName} to the database`);
        const conn = await getPool().getConnection();
        const query = 'insert into user (email, first_name, last_name, password) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [ body.email, body.firstName, body.lastName, password ] );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}

const loginUser = async (body: any): Promise<any> => {
    try {
        Logger.info(`Authenticating user with email: ${body.email}`);
        const conn = await getPool().getConnection();
        const getQuery = 'select password, id from user where email = ?';
        const [ result ] = await conn.query( getQuery, [ body.email ] );
        if (!(result.length > 0)) {
            Logger.info(`no user with that email`);
            await conn.release();
            return false;
        }
        if (!await compare(body.password, result[0].password)) {
            Logger.info(`passwords don't match`);
            await conn.release();
            return false;
        }
        Logger.info(`passwords match`);
        result[0].token = createToken(`${result[0].id}`);
        const setQuery = 'update user set auth_token = ? where id = ?';
        const [ tokenSet ] = await conn.query( setQuery, [ result[0].token, result[0].id ] );
        await conn.release();
        return result[0];
    } catch(err) {
        Logger.error(err);
    }
}

const logoutUser = async (id: string): Promise<boolean> => {
    try {
        Logger.info(`logging out user ${id}`);
        const conn = await getPool().getConnection();
        const query = 'update user set auth_token = null where id = ?';
        const [ updateResult ] = await conn.query( query, [ Number(id) ] );
        const deletedQuery = 'select auth_token from user where id = ?';
        const [ deletedResult ] = await conn.query( deletedQuery, [ Number(id) ] );
        await conn.release();
        Logger.info(`auth token${deletedResult[0].auth_token}`);
        if (deletedResult[0].auth_token) {
            throw new Error('Logout failed');
        } else {
            return updateResult;
        }
    } catch(err) {
        Logger.error(err);
    }
}

const viewUser = async (id: string, authenticated: boolean): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        if (authenticated) {
            Logger.info(`Getting user ${id} from the database (authenticated)`);
            const query = 'select email, first_name as firstName, last_name as lastName from user where id = ?';
            const [ result ] = await conn.query( query, [ Number(id) ] );
            await conn.release();
            return result;
        } else {
            const query = 'select first_name as firstName, last_name as lastName from user where id = ?';
            const [ result ] = await conn.query( query, [ id ] );
            await conn.release();
            return result;
        }
    } catch(err) {
        Logger.error(err);
    }
}
const updateUser = async (id: string, updateData: Record<string, any>): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        const values: any[] = [];
        let query = 'update user set ';
        if (updateData.oldPassword) {
            const passQuery = 'select password from user where id = ?';
            const [ currentPassword ] = await conn.query( passQuery, id );
            if (!await compare(String(updateData.oldPassword), String(currentPassword[0].password))) {
                await conn.release();
                return -1;
            }
            values.push(String(updateData.password));
            query += 'password = ?'
        }
        if (updateData.email) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(String(updateData.email));
            query += 'email = ?'
        }
        if (updateData.firstName) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(String(updateData.firstName));
            query += 'first_name = ?'
        }
        if (updateData.lastName) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(String(updateData.lastName));
            query += 'last_name = ?'
        }
        query += ' where id = ?'
        values.push(Number(id));
        Logger.http(`${query} query`)
        const [ result ] = await conn.query( query, values );
        await conn.release();
        Logger.http(`released`)
        return result;
    } catch(err) {
        Logger.error(err);
    }
}

const checkUnique = async (key: string, value: string): Promise<boolean> => {
    Logger.http(`checking uniqueness`)
    try {
        const conn = await getPool().getConnection();
        const query = 'select ' + key + ' from user where ' + key + ' = ?';
        const [ result ] = await conn.query( query, value );
        await conn.release();
        return !(result.length > 0);
    } catch(err) {
        Logger.error(err);
    }
}



export {registerUser, loginUser, logoutUser, viewUser, updateUser, checkUnique, checkToken}