import { getPool } from '../../config/db';
import Logger from '../../config/logger';

const dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const getAllPetitions = async (params: any): Promise<any> => {
    Logger.info(`Getting petitions from database`)
    try {
        const conn = await getPool().getConnection();
        const values: any[] = [];
        let query = 'select petition.id as petitionId, petition.title, petition.category_id as categoryId,' +
            ' petition.creation_date as creationDate, petition.owner_id as ownerId, user.first_name as' +
            ' ownerFirstName, user.last_name as ownerLastName, count(supporter.petition_id) as numberOfSupporters,' +
            ' min(support_tier.cost) as supportingCost from petition left join supporter on' +
            ' petition.id=supporter.petition_id left join support_tier on petition.id=support_tier.petition_id' +
            ' left join user on petition.owner_id = user.id ';
        if (params.categoryIds) {
            query += 'left join category on category.id = petition.category_id where (';
            for (let i = 0; i < params.categoryIds.length; i++) {
                values.push(Number(params.categoryIds[i]));
                query += 'category.id = ?';
                if (i === (params.categoryIds.length - 1)) {
                    query += ') and ';
                } else {
                    query += ' or ';
                }
            }
        } else {
            query += 'where ';
        }
        if (params.ownerId) {
            values.push(Number(params.ownerId));
            query += 'petition.owner_id = ? and ';
        }
        if (params.supporterId) {
            values.push(Number(params.supporterId));
            query += 'supporter.user_id = ? and ';
        }
        if (params.q === '') {
            Logger.info(`q is empty string`)
            return false;
        }
        if (params.q) {
            values.push(`%${params.q}%`);
            values.push(`%${params.q}%`);
            query += `(petition.description like ? or petition.title like ?) and `;
        }
        query += '1=1 GROUP BY petition.id, petition.title, petition.category_id, petition.creation_date,' +
            ' petition.owner_id ';
        if (params.supportingCost) {
            values.push(Number(params.supportingCost));
            query += 'having MIN(support_tier.cost) <= ? ';
        }
        query += 'order by '
        if (params.sortBy) {
            switch (params.sortBy) {
                case 'ALPHABETICAL_ASC':
                    query += 'petition.title ASC';
                    break;
                case 'ALPHABETICAL_DESC':
                    query += 'petition.title DESC';
                    break;
                case 'COST_ASC':
                    query += 'supportingCost ASC';
                    break;
                case 'COST_DESC':
                    query += 'supportingCost DESC';
                    break;
                case 'CREATED_DESC':
                    query += 'petition.creation_date DESC';
                    break;
                case 'CREATED_ASC':
                    query += 'petition.creation_date ASC';
                    break;
                default:
                    return false;
            }
        } else {
            query += 'petition.creation_date ASC';
        }

        const [ result ] = await conn.query( query, values);
        await conn.release();
        const paginatedResult = [];
        if (!params.count) {
            params.count = result.length;
        }
        if (!params.startIndex) {
            params.startIndex = 0;
        }
        if (result.length < params.startIndex) {
            return false;
        }
        for (let i = 0; i < result.length; i++) {
            if ((i >= parseInt(params.startIndex, 10)) && (i < (parseInt(params.startIndex, 10) + parseInt(params.count, 10)))) {
                paginatedResult.push(result[i]);
            }
            if (i > parseInt(params.startIndex, 10) + parseInt(params.count, 10)) {
                break;
            }
        }
        return {"petitions": paginatedResult, "count": result.length};
    } catch(err) {
        Logger.error(err);
    }
}
const getPetition = async (id: string): Promise<any> => {
    Logger.info(`Getting petition from database`)
    try {
        const conn = await getPool().getConnection();
        const mainQuery = 'select petition.id as petitionId, petition.title, petition.category_id as categoryId,' +
            ' petition.owner_id as ownerId, user.first_name as ownerFirstName, user.last_name as ownerLastName,' +
            ' petition.creation_date as creationDate, petition.description, sum(support_tier.cost) as moneyRaised' +
            ' from petition left join supporter on petition.id=supporter.petition_id' +
            ' left join support_tier on petition.id=support_tier.petition_id left join user on petition.owner_id =' +
            ' user.id where petition.id = ? group by petition.id';
        const [ result ] = await conn.query( mainQuery, id );
        if (result.length > 0) {
            const supportTierQuery = 'select support_tier.title, support_tier.description, cost, support_tier.id as' +
                ' supportTierId from support_tier join petition on support_tier.petition_id = petition.id where petition.id = ?';
            const [ supportTiers ] = await conn.query( supportTierQuery, id );
            result[0].supportTiers = supportTiers;
            await conn.release();
            return result[0];
        }
        await conn.release();
        return false;
    } catch(err) {
        Logger.error(err);
    }
}
const addPetition = async (id: number, body: any): Promise<any> => {
    Logger.info(`Adding petition to database`)
    try {
        const categories = await getCategories();
        let categoryFlag = 0;
        for (const item of categories) {
            if (item.categoryId === body.categoryId) {
                categoryFlag = 1;
                break;
            }
        }
        if (!categoryFlag){
            return false;
        }
        if (!body.supportTiers[0] || body.supportTiers[3]) {
            return false;
        }


        const tierTitles: any[] = [];
        for (const item of body.supportTiers) {
            if (tierTitles.includes(item.title)) {
                return false;
            }
            tierTitles.push(item.title);
        }
        const creationDate: Date = new Date();
        dateFormatter.format(creationDate);
        const conn = await getPool().getConnection();
        const petitionQuery = 'insert into petition (creation_date, owner_id, title, description, category_id) values' +
            ' (?, ?, ?, ?, ?)';
        const [ petitionResult ] = await conn.query( petitionQuery, [creationDate, Number(id), String(body.title), String(body.description), Number(body.categoryId)] );
        const supportTierQuery = 'insert into support_tier (petition_id, title, description, cost) values (?, ?, ?, ?)';
        for (const item of body.supportTiers) {
            await conn.query( supportTierQuery, [Number(petitionResult.insertId), String(item.title), String(item.description), Number(item.cost)] );
        }
        await conn.release();
        petitionResult.supportTiers = body.supportTiers;
        return {petitionId: petitionResult.insertId};
    } catch(err) {
        Logger.error(err);
    }
}
const editPetition = async (id: string, body: any): Promise<boolean> => {
    Logger.info(`Editing petition on database`)
    try {
        if (!body.title && !body.description && !body.categoryId) {
            return true; // No changes were made
        }
        let query = 'update petition set ';
        const values: any[] = [];
        if (body.categoryId) {
            const categories = await getCategories();
            let categoryFlag = 0;
            for (const item of categories) {
                if (item.categoryId === body.categoryId) {
                    categoryFlag = 1;
                    break;
                }
            }
            if (!categoryFlag){
                return false;
            }
            if (values.length > 0) {
                query += ', '
            }
            values.push(Number(body.categoryId));
            query += 'category_id = ? ';
        }
        if (body.title) {
            if (values.length > 0) {
                query += ', '
            }
            values.push(String(body.title));
            query += 'title = ? ';
        }
        if (body.description) {
            if (values.length > 0) {
                query += ', '
            }
            values.push(String(body.description));
            query += 'description = ? ';
        }
        values.push(id);
        query += 'where id = ?';
        const conn = await getPool().getConnection();
        const [ result ] = await conn.query( query, values );
        await conn.release();
        return true;
    } catch(err) {
        Logger.error(err);
    }
}
const deletePetition = async (id: string): Promise<boolean> => {
    try {
        Logger.info( `Deleting petition from database`)
        const conn = await getPool().getConnection();
        const supporterQuery = 'select supporter.id from petition join supporter on supporter.petition_id =' +
            ' petition.id where petition.id = ?';
        const [ supporterResult ] = await conn.query( supporterQuery, id );
        if (supporterResult.length > 0) {
            return false;
        }
        const query = 'delete from petition where id = ?';
        const [ result ] = await conn.query( query, id );
        await conn.release();
        return true;
    } catch(err) {
        Logger.error(err);
    }
}
const getCategories = async (): Promise<any> => {
    Logger.info(`Getting categories from database`)
    try {
        const conn = await getPool().getConnection();
        const query = 'select id as categoryId, name from category';
        const [ result ] = await conn.query( query );
        await conn.release();
        return result;
    } catch(err) {
        Logger.error(err);
    }
}

export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};