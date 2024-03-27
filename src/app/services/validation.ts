import Logger from '../../config/logger';
import Ajv from 'ajv';
import addFormats from "ajv-formats";

const ajv = new Ajv({removeAdditional: 'all', useDefaults: true, validateFormats: true});
addFormats(ajv);

const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = validator(data);
        if (!valid)
            return ajv.errorsText(validator.errors);
        return true;
    } catch (err) {
        return err.message;
    }
}

export {validate}