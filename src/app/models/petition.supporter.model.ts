import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { compare } from '../services/passwords';
import {createToken, decodeToken} from "../services/session";

const dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});
const addSupporter = async (supporter: any): Promise<any> => {
    try {
        Logger.info(`Adding supporter to petition on database`);
        const timestamp: Date = new Date();
        dateFormatter.format(timestamp);
        const conn = await getPool().getConnection();
        const query = 'insert into supporter (petition_id, support_tier_id, user_id, message, timestamp) values (?,' +
            ' ?, ?, ?, ?)';
        const result = await conn.query( query, [ Number(supporter.petitionId), Number(supporter.supportTierId), Number(supporter.id), String(supporter.message), timestamp ] );
        await conn.release();
        return true;
    } catch(err) {
        Logger.error(err);
        return false;
    }
}
const getAllSupportersForPetition = async (id: string): Promise<any> => {
    Logger.info(`Getting supporters for petition from database`)
    try {
        const conn = await getPool().getConnection();
        const query = 'select supporter.id as supportId, support_tier_id as supportTierId, message, user_id as' +
            ' supporterId, user.first_name as supporterFirstName, user.last_name as supporterLastName, timestamp' +
            ' from supporter left join user on supporter.user_id = user.id join petition on supporter.petition_id =' +
            ' petition.id where petition.id = ? order by timestamp desc';
        const [ result ] = await conn.query( query, Number(id) );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}


export {getAllSupportersForPetition, addSupporter};