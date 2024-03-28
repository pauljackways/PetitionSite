import * as users from '../models/user.model';
import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as schemas from '../resources/schemas.json';
import {hash} from '../services/passwords';
import {decodeToken, checkToken} from "../services/session";
import {validate} from "../services/validation";


const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST create a user with name: ${req.body.firstName} ${req.body.lastName}, email: ${req.body.email}`)
    try{
        const validation = await validate(schemas.user_register, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        if (!await users.checkUnique('email', req.body.email)) {
            Logger.http(`Email already in use`)
            res.status(403).send('Forbidden. Email already in use');
            return;
        }
        const hashedPassword = await hash(req.body.password);
        const result = await users.registerUser(req.body, hashedPassword);
        res.status(201).send({"userId": result.insertId});
    } catch (err) {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    try {
        Logger.http(`POST log in user: ${req.body.email}`)
        const validation = await validate(schemas.user_login, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const result = await users.loginUser(req.body);
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
        if (!await checkToken(`${id}`,tokenCoded)) {
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Unauthorized. Cannot log out if you are not authenticated";
            res.status(401).send();
            return;
        }
        if (await users.logoutUser(`${id}`)) {
            Logger.http(`Logged out`)
            res.statusMessage = "OK. Logged out";
            res.status(200).send();
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
        const authenticated = await checkToken(`${req.params.id}`, tokenCoded);
        const result = await users.viewUser(req.params.id, authenticated);
        if (result.length === 0) {
            Logger.http(`Not Found. No user with specified ID`)
            res.statusMessage = "Not Found. No user with specified ID";
            res.status(404).send();
            return;
        } else {
            Logger.http(`Sending user info`)
            res.statusMessage = "OK";
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
        const validation = await validate(schemas.user_edit, req.body);
        if (validation !== true) {
            Logger.http(`Failed ajv validation. ${validation.toString()}`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const token = req.header('X-Authorization');
        if (!token) {
            Logger.http(`Token not provided`)
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const id = await decodeToken(token);
        if (!await checkToken(`${req.params.id}`, token)){
            Logger.http(`Token not valid for user`)
            res.statusMessage = "Forbidden. Can not edit another user's information";
            res.status(403).send();
            return;
        }
        if (req.body.password + req.body.currentPassword === 1) {
            Logger.http(`One password given, not both`)
            res.status(400).send(`Bad request. Invalid information`);
            return;
        }
        const updateData: Record<string, any> = {};
        if (req.body.password && req.body.currentPassword) {
            Logger.info(`Both passwords exist`)
            if (req.body.password === req.body.currentPassword) {
                Logger.info(`Both passwords same`)
                res.statusMessage = "Forbidden. Identical current and new passwords";
                res.status(403).send();
                return;
            } else {
                Logger.info(`Passwords both given and different`)
                const hashedPassword = await hash(req.body.password);
                updateData.password = hashedPassword;
                updateData.oldPassword = req.body.currentPassword;
            }
        }
        updateData.firstName = req.body.firstName;
        updateData.lastName = req.body.lastName;
        if (req.body.email) {
            if (!await users.checkUnique('email', req.body.email)) {
                Logger.http(`Email already in use`)
                res.status(403).send('Forbidden. Email already in use');
                return;
            } else {
                updateData.email = req.body.email;
            }
        }
        const userId = req.params.id;
        const result = await users.updateUser(`${userId}`, updateData);
        if (result === -1) {
            Logger.http(`Old password doesn't match password related to ID`)
            res.statusMessage = "Unauthorized or Invalid currentPassword";
            res.status(401).send();
            return;
        }
        if (result.affectedRows > 0) {
            Logger.http(`Updated user`)
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