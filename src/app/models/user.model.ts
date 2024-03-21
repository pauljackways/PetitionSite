import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { compare } from '../services/passwords';
import {createToken} from "../services/session";

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
        const [ result ] = await conn.query( getQuery, [ email, password ] );
        Logger.http(`result ${password}: ${result.password}`)
        Logger.http(`result ${result}`)
        if (result[0] === null) {
            Logger.info(`no user with that ID`);
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
            const [ tokenSet ] = await conn.query( getQuery, [ result[0].token, result[0].id ] );
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
        const getQuery = 'select auth_token from user where id = ?';
        const deleteQuery = 'delete auth_token from user where id = ?';
        const [ deleteResult ] = await conn.query( deleteQuery, [ id ] );
        const [ deleteCheck ] = await conn.query( getQuery, [ id ] );
        await conn.release();
        if (deleteCheck[0]) {
            throw new Error('Logout failed');
        } else {
            return true;
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
        if (updateData.email) {
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
        if (updateData.password) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(updateData.password);
            query += 'password = ?'
        }
        query += ' where id = ?'
        values.push(id);
        Logger.http(`${query} query`)
        const [ result ] = await conn.query( query, values );
        await conn.release();
        Logger.http(`released`)
        return result.affectedRows;
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

const checkToken = async (id: string, userToken: string): Promise<boolean> => {
    Logger.http(`checking token ${id}`)
    try {
        const conn = await getPool().getConnection();
        const getQuery = 'select auth_token from user where id = ?';
        const [ databaseToken ] = await conn.query( getQuery, [ id ] );
        Logger.http(`checking token ${userToken} ${databaseToken.auth_token} ${databaseToken[0]}`)
        if (!databaseToken.auth_token) {
            return false;
        }
        return databaseToken.auth_token === userToken;
    } catch (err) {
        Logger.error(err);
    }
}

export {registerUser, loginUser, logoutUser, viewUser, updateUser, checkUnique, checkToken}