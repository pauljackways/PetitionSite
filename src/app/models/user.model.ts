import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { compare } from '../services/passwords';
import {createToken, decodeToken} from "../services/session";

const registerUser = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
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

const loginUser = async (email: string, password: string): Promise<any> => {
    try {
        Logger.info(`Authenticating user with email: ${email}`);
        const conn = await getPool().getConnection();
        const getQuery = 'select password, id from user where email = ?';
        const [ result ] = await conn.query( getQuery, [ email ] );
        if (!(result.length > 0)) {
            Logger.info(`no user with that email`);
            await conn.release();
            return false;
        }
        if (!await compare(password, result[0].password)) {
            Logger.info(`passwords don't match`);
            await conn.release();
            return false;
        } else {
            Logger.info(`passwords match`);
            result[0].token = createToken(`${result[0].id}`);
            const setQuery = 'update user set auth_token = ? where id = ?';
            const [ tokenSet ] = await conn.query( setQuery, [ result[0].token, result[0].id ] );
            return result[0];
        }
    } catch(err) {
        Logger.error(err);
    }
}

const logoutUser = async (id: string): Promise<boolean> => {
    try {
        Logger.info(`logging out user ${id}`);
        const conn = await getPool().getConnection();
        const query = 'update user set auth_token = null where id = ?';
        const [ updateResult ] = await conn.query( query, [ id ] );
        const deletedQuery = 'select auth_token from user where id = ?';
        const [ deletedResult ] = await conn.query( deletedQuery, [ id ] );
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
            const query = 'select email, first_name, last_name from user where id = ?';
            const [ result ] = await conn.query( query, [ id ] );
            await conn.release();
            return result;
        } else {
            const query = 'select first_name, last_name from user where id = ?';
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
        const values: string[] = [];
        let query = 'update user set ';
        if (updateData.oldPassword) {
            const passQuery = 'select password from user where id = ?';
            const [ currentPassword ] = await conn.query( passQuery, id );
            Logger.info(`Checking ${id} oldpassword ${updateData.oldPassword} ${currentPassword[0].password} matches db`)
            if (!await compare(updateData.oldPassword, currentPassword[0].password)) {
                await conn.release();
                return -1;
            }
            values.push(updateData.password);
            query += 'password = ?'
        }
        if (updateData.email) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(updateData.email);
            query += 'email = ?'
        }
        if (updateData.firstName) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(updateData.firstName);
            query += 'first_name = ?'
        }
        if (updateData.lastName) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(updateData.lastName);
            query += 'last_name = ?'
        }
        query += ' where id = ?'
        values.push(id);
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
        Logger.http(`${!(result.length > 0)} ${result.length} ${result} result`)
        return !(result.length > 0);
    } catch(err) {
        Logger.error(err);
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

export {registerUser, loginUser, logoutUser, viewUser, updateUser, checkUnique, checkToken}