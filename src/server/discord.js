import btoa from "btoa";
import fetch from 'node-fetch';

const BASEURL = "https://discord.com/api/v9/";

const CLIENTID = process.env.DISCORDCLIENTID;
const CLIENTSECRET = process.env.DISCORDCLIENTSECRET;
const REDIRECTURI = process.env.DISCORDREDIRECTURI;
const ENCODEDURI = encodeURIComponent(REDIRECTURI);

let myExports = {};

class InvalidTokenException extends Error {}

myExports.InvalidTokenException = InvalidTokenException;

myExports.getUserinfo = (accessToken) => {

    if (!accessToken) return Promise.reject(new Error('NoAccessTokenProvided'));

    return fetch(`${BASEURL}users/@me`, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
        .then(response => response.json())
        .then(response => {
            if (response.message && response.code === 0) {
                throw new InvalidTokenException("Invalid token");
            }
            return response;
        });
}

function getAccessToken(payload, res) {
    fetch(`${BASEURL}oauth2/token`,
        {
            method: 'POST',
            body: payload,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        })
        .then(response => response.json())
        .then(response => {
            if (response.error && response.error === "invalid_request") {
                res.redirect("/login");
                return null;
            }
            return response
        })
        .then(token => {
            if (!token) {
                return;
            }
            res.cookie('dtoken', token['access_token']);
            res.cookie('drefresh', token['refresh_token'], {path: '/refresh', secure: true})
            res.redirect("/");
        });
}

export default function (app) {
    app.get('/login', ((req, res) => {
        res.redirect(`${BASEURL}oauth2/authorize?client_id=${CLIENTID}&redirect_uri=${ENCODEDURI}&response_type=code&scope=identify`)
    }))

    app.get('/api/discord', (req, res) => {
        if (!req.query.code) {res.redirect("/");return;}
        const code = req.query.code;
        const creds = btoa(`${CLIENTID}:${CLIENTSECRET}`);

        const payload = new URLSearchParams();
        payload.append('client_id', CLIENTID);
        payload.append('client_secret', CLIENTSECRET);
        payload.append('grant_type', 'authorization_code');
        payload.append('code', code);
        payload.append('redirect_uri', REDIRECTURI);
        payload.append('scope', 'identify');

        getAccessToken(payload, res);

    });

    app.get('/refresh', (req, res) => {

        const refreshToken = req.cookies.drefresh;
        if (!refreshToken) res.redirect("/login");

        const payload = new URLSearchParams();
        payload.append('client_id', CLIENTID);
        payload.append('client_secret', CLIENTSECRET);
        payload.append('grant_type', 'refresh_token');
        payload.append('refresh_token', refreshToken);
        payload.append('redirect_uri', REDIRECTURI);
        payload.append('scope', 'identify');

        getAccessToken(payload, res);

    });

    return myExports;
}
