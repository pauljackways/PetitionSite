import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import * as fs from 'fs';
import { ResultSetHeader } from 'mysql2';
const filePath = `storage/default/`;
const getImage = async (table: string, id: string): Promise<any> => {
    try {
        Logger.info(`getting photo from database`);
        const conn = await getPool().getConnection();
        const query = 'select id, image_filename from ' + table + ' where id = ?';
        const [ queryResult ] = await conn.query( query, [ id ] );
        await conn.release();
        let imageData: Buffer = null;
        if (queryResult.length > 0) {
            try {
                imageData = await fs.promises.readFile(filePath + queryResult[0].image_filename);
            } catch (err) {
                return false;
            }
            return {
                filename: queryResult[0].image_filename,
                binary: imageData
            };
        }
        return false;
        } catch(err) {
        Logger.error(err);
    }
}

const setImage = async (table: string, id: string, MIME: string, imageData: Buffer): Promise<any> => {
    try {
        Logger.info(`Adding / replacing profile photo to the database`);
        const filename = `${table}_${id}.${MIME.substring(6)}`;
        let existsFlag = false;
        if (fs.existsSync(filePath+filename)) {
            existsFlag = true;
            await deleteImage(table, id, filename);
        }
        await fs.promises.writeFile((filePath+filename), imageData, { flag: 'wx' });
        const conn = await getPool().getConnection();
        const query = 'update ' + table + ' set image_filename = ? where id = ?';
        const [ result ] = await conn.query( query, [ filename, id ] );
        await conn.release();
        return existsFlag;
    } catch(err) {
        Logger.error(err);
    }
}

const deleteImage = async (table: string, id: string, filename = ''): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        const getQuery = 'select image_filename from ' + table + ' where id = ?';
        const [ queryResult ] = await conn.query( getQuery, id );
        await conn.release();
        try {
            await fs.promises.unlink(filePath + queryResult[0].image_filename);
        } catch(err) {
            Logger.info(`no file 1`)
        }
        try {
            await fs.promises.unlink(filePath + filename);
        } catch(err) {
            Logger.info(`no file 2`)
        }
        return true;
    } catch(err) {
        return false;
    }
}


export {getImage, setImage, deleteImage}