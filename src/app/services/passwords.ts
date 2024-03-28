import bcrypt from 'bcrypt';
import Logger from "../../config/logger";
const hash = async (password: string): Promise<string> => {
    Logger.info(`Hashing password`);
    try {
        const saltOrRounds = 0;
        return await bcrypt.hash(password, saltOrRounds);
    } catch (err) {
        return err.message;
    }
}

const compare = async (password: string, hashPassword: string): Promise<boolean> => {
    Logger.info(`Comparing passwords`);
    try {
        return await bcrypt.compare(password, hashPassword);
    } catch (err) {
        Logger.info(`${err.message}`);
        return false;
    }
}

export {hash, compare}