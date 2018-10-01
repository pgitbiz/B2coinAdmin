const fs = require('fs');
const remraf = require('rimraf');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

const SPREADSHEET_ID = '14fox-OINJJqBxfE1Z-PuJiro9cuUQy18ozN66PAOcvg';
const SPREADSHEET_RANGE = 'UI';

const FIELD_LANGUAGE = {
    kor: 'KOREAN',
    eng: 'ENGLISH',
    jpn: 'JAPANESE',
};
const FIELD_DEPTH = ['코드-1', '코드-2', '코드-3'];
const EXPORT_FILE_TAG = 'i18n-';

fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listMajors);
});

function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function listMajors(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SPREADSHEET_RANGE,
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            proc(rows);
        } else {
            console.log('No data found.');
        }
    });
}

function proc(rows) {
    // 폴더 초기화
    remraf.sync(__dirname + '/dist');
    fs.mkdirSync(__dirname + '/dist');

    for (const lang in FIELD_LANGUAGE) {
        const OUTPUT = new Object();
        const
            iLang = rows[0].indexOf(FIELD_LANGUAGE[lang]),
            iDepth0 = rows[0].indexOf(FIELD_DEPTH[0]),
            iDepth1 = rows[0].indexOf(FIELD_DEPTH[1]),
            iDepth2 = rows[0].indexOf(FIELD_DEPTH[2]);

        rows.unshift();
        rows.forEach(row => {
            const d0 = row[iDepth0], d1 = row[iDepth1], d2 = row[iDepth2];
            if (!OUTPUT[d0]) {
                OUTPUT[d0] = {};
            }
            if (!OUTPUT[d0][d1]) {
                OUTPUT[d0][d1] = {};
            }
            OUTPUT[d0][d1][d2] = row[iLang];
        });

        fs.writeFileSync(__dirname + '/dist/' + EXPORT_FILE_TAG + lang + '.json', JSON.stringify(OUTPUT), 'utf-8');
    }
}