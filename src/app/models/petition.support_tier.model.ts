import { getPool } from '../../config/db';
import Logger from '../../config/logger';

const addSupportTier = async (id: string, body: any): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        const query = 'insert into support_tier (title, description, cost, petition_id) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [body.title, body.description, body.cost, id] );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
        return false;
    }
}
const deleteSupportTier = async (id: string): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        const query = 'delete from support_tier where id = ?';
        const [ result ] = await conn.query( query, id );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
        return false;
    }
}
const editSupportTier = async (id: string, body: any): Promise<any> => {
    Logger.http(`patching support tier`)
    try {
        const conn = await getPool().getConnection();
        let query = 'update support_tier set ';
        const values: string[] = [];
        if (body.title) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(body.title);
            query += 'title = ?'
        }
        if (body.description) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(body.description);
            query += 'description = ?'
        }
        if (body.cost) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(body.cost);
            query += 'cost = ?'
        }
        query += ' where id = ?';
        values.push(id);

        const [ result ] = await conn.query( query, values );
        await conn.release();
        return result.affectedRows;
    } catch(err) {
        Logger.error(err);
    }
}


export {editSupportTier, deleteSupportTier, addSupportTier};