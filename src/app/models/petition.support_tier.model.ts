import { getPool } from '../../config/db';
import Logger from '../../config/logger';

const addSupportTier = async (id: string, body: any): Promise<any> => {
    try {
        const conn = await getPool().getConnection();
        const query = 'insert into support_tier (title, description, cost, petition_id) values (?, ?, ?, ?)';
        const [ result ] = await conn.query( query, [String(body.title), String(body.description), Number(body.cost), Number(id)] );
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
        const [ result ] = await conn.query( query, Number(id) );
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
        const values: any[] = [];
        if (body.title) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(String(body.title));
            query += 'title = ?'
        }
        if (body.description) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(String(body.description));
            query += 'description = ?'
        }
        if (body.cost) {
            if (values.length > 0) {
                query += ', ';
            }
            values.push(Number(body.cost));
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