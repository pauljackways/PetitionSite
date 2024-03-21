import * as users from '../models/user.model';
import {Request, Response} from "express";
import Logger from '../../config/logger';
import Ajv from 'ajv';
import addFormats from "ajv-formats";
import * as schemas from '../resources/schemas.json';
import {hash, compare } from '../services/passwords';
import {createToken, decodeToken} from "../services/session";

const ajv = new Ajv({removeAdditional: 'all', strict: true});
addFormats(ajv);
const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = await validator(data);
        if (!valid)
            return ajv.errorsText(validator.errors);
        return true;
    } catch (err) {
        return err.message;
    }
}
const register = async (req: Request, res: Response): Promise<void> => {

    Logger.http(`POST create a user with name: ${req.body.firstName} ${req.body.lastName}, email: ${req.body.email}`)

    try{
        const validation = await validate(
            schemas.user_register,
            req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const email = req.body.email;
        if (!await users.checkUnique('email', email)) {
            Logger.http(`email already in use`)
            res.status(403).send('Forbidden. Email already in use');
            return;
        }
        const hashedPassword = await hash(req.body.password);
        const result = await users.registerUser(email, firstName, lastName, hashedPassword);
        res.status(201).send(`Created. id: ${result.insertId}`);
    } catch (err) {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    try {
        Logger.http(`POST log in user: ${req.body.email}`)
        const validation = await validate(
            schemas.user_login,
            req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const email = req.body.email;
        const password = req.body.password;
        const result = await users.loginUser(email, password);
        if (!result) {
            Logger.http(`Result is empty`);
            res.status(401).send(`UnAuthorized. Incorrect email/password`);
            return;
        }
        const tokenJson = {
            "userId": result.id,
            "token": result.token
        }
        res.status(200).json(tokenJson);
        Logger.http(`Token JSON: ${JSON.stringify(tokenJson)}`);
        Logger.http(`User ID: ${JSON.parse(JSON.stringify(tokenJson)).userId}`);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try{
        const tokenCoded = req.header('X-Authorization');
        const id = await decodeToken(tokenCoded);
        if (!await users.checkToken(`${id}`,tokenCoded)) {
            res.statusMessage = "Unauthorized. Cannot log out if you are not authenticated";
            res.status(401).send();
            return;
        }
        if (await users.logoutUser(`${id}`)) {
            res.statusMessage = "logged out";
            res.status(200).send(`OK`);
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    try{
        const tokenCoded = req.header('X-Authorization');
        const authenticated = await users.checkToken(`${req.params.id}`, tokenCoded);
        const result = await users.viewUser(req.params.id, authenticated);
        if (result.length === 0) {
            res.status(404).send('Not Found. No user with specified ID');
            return;
        } else {
            res.status(200).send(result[0]);
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.user_edit,
            req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const tokenCoded = req.header('X-Authorization');
        const id = await decodeToken(tokenCoded);
        if (!await users.checkToken(`${req.params.id}`, tokenCoded)){
            Logger.http(`token not valid for user`)
            res.statusMessage = "Forbidden. Can not edit another user's information";
            res.status(403).send();
            return;
        }
        if (req.body.password + req.body.currentPassword === 1) {
            Logger.http(`one password given, not both`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const updateData: Record<string, any> = {};
        if (req.body.password && req.body.currentPassword) {
            Logger.http(`both passwords exist`)
            if (req.body.password === req.body.currentPassword) {
                Logger.http(`both passwords same`)
                res.statusMessage = "Forbidden. Identical current and new passwords";
                res.status(403).send();
                return;
            } else {
                Logger.http(`passwords both given and different`)
                const hashedPassword = await hash(req.body.password);
                updateData.password = hashedPassword;
                Logger.http(`new password ${updateData.password}`)
                updateData.oldPassword = req.body.currentPassword;
            }
        }
        updateData.first_name = req.body.firstName;
        updateData.last_name = req.body.lastName;
        if (req.body.email) {
            if (!await users.checkUnique('email', req.body.email)) {
                Logger.http(`email already in use`)
                res.status(403).send('Forbidden. Email already in use');
                return;
            } else {
                updateData.email = req.body.email;
            }
        }
        const userId = req.params.id;
        const result = await users.updateUser(`${userId}`, updateData);
        if (result === -1) {
            Logger.http(`ID given password doesn't match oldpassword`)
            res.statusMessage = "Unauthorized or Invalid currentPassword";
            res.status(401).send();
            return;
        }
        if (result.affectedRows > 0) {
            Logger.http(`updated`)
            res.status(200).send(result[0]);
            return;
        } else {
            Logger.http(`Not Found`)
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}