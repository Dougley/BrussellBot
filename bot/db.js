var pg = require('pg');
const SERVER_DB_NAME = 'servers';
ServerSettings = {};

exports.sql = function(bot, msg, query) {
	var timeTaken = new Date();
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (err) console.log(err);
		else {
			var q = client.query(query);
			q.on('error', (e) => { bot.sendMessage(msg, '```' + e.message + '```'); return; });
			q.on('row', (row, result) => { result.addRow(row); });
			q.on('end', (result) => {
				if (result.rowCount > 0 && result !== undefined) {
					var formatted = '**Command:** ' + result.command + " **| Time taken:** " + (timeTaken - msg.timestamp) + "ms";
					result.rows.map((row) => {
						formatted += '\n━━━━━━━━━━━━━';
						for (var key in row)
							if (row[key] !== null && row[key] !== '') formatted += '\n**' + key + ':** `' + row[key] + '`';
					});
					formatted = formatted.replace(/@/g, '');
					if (formatted.length < 2000) bot.sendMessage(msg, formatted);
					else { bot.sendMessage(msg, formatted.substr(0, 2000)); bot.sendMessage(msg, formatted.substr(2000)); }
				}
			});
			done();
		}
	});
};

function fetchDB(tableName) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
		if (!err) {
			var q = client.query('SELECT * FROM ' + tableName);
			q.on('error', (e) => { console.log(e.message); return; });
			ServerSettings = {};
			q.on('row', (row) => {
				ServerSettings[row.id] = {'deletecmds': row.deletecmds, 'welcomemsg': row.welcomemsg, 'banalerts': row.banalerts, 'namechanges': row.namechanges};
			});
			done();
		} else { console.log(err); setTimeout(() => { fetchDB(SERVER_DB_NAME); }, 300000); return; }
	});
}

function updateServerDB(sID) {
	if (sID && ServerSettings.hasOwnProperty(sID)) {
		pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
			if (!err) {
				var q = client.query('SELECT * FROM ' + SERVER_DB_NAME + ' WHERE id = ' + sID);
				q.on('error', (e) => { console.log(e.message); done(); return; });
				q.on('end', (result) => {
					if (!result) { console.log('No data returned from query'); return; done(); }
					var updateQ = client.query('UPDATE ' + SERVER_DB_NAME + ' SET deletecmds = $1, welcomemsg = $2, banalerts = $3, namechanges = $4 WHERE id = ' + sID, [ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges]);
					updateQ.on('error', (e) => { console.log('Error updating server settings: ' + e.message); done(); return; });
					updateQ.on('end', (result) => { done(); });
				});
			} else { console.log(err); return; }
		});
	} else return;
}

exports.fetchServerDB = function(tableName) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
		if (!err) {
			var q = client.query('SELECT * FROM ' + tableName);
			q.on('error', (e) => { console.log(e.message); return; });
			ServerSettings = {};
			q.on('row', (row) => { ServerSettings[row.id] = {'deletecmds': row.deletecmds, 'welcomemsg': row.welcomemsg, 'banalerts': row.banalerts, 'namechanges': row.namechanges, 'ignored': row.ignored}; });
			done();
		} else { console.log(err); setTimeout(() => { fetchDB(SERVER_DB_NAME); }, 300000); return; }
	});
};
exports.updateServerDB = function(sID, callback, onFail) {
	if (sID && ServerSettings.hasOwnProperty(sID)) {
		pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
			if (!err) {
				var q = client.query('SELECT * FROM ' + SERVER_DB_NAME + ' WHERE id = ' + sID);
				q.on('error', (e) => { console.log(e.message); done(); if(onFail){onFail();} return; });
				q.on('end', (result) => {
					if (!result) { console.log('No data returned from query'); return; done(); }
					var updateQ = client.query('UPDATE ' + SERVER_DB_NAME + ' SET deletecmds = $1, welcomemsg = $2, banalerts = $3, namechanges = $4, ignored = $5 WHERE id = ' + sID, [ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges, ServerSettings[sID].ignored]);
					updateQ.on('error', (e) => { console.log('Error updating server settings: ' + e.message); done(); if(onFail){onFail();} return; });
					updateQ.on('end', (result) => { done(); callback(); });
				});
			} else { console.log(err); if(onFail){onFail();} return; }
		});
	} else return;
};
exports.addToDB = function(sID, callback, onFail) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
		if (!err) {
			var q = client.query('INSERT INTO ' + SERVER_DB_NAME + ' VALUES ($1, $2, $3, $4, $5, $6)', [sID, ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges, 'none']);
			q.on('error', (e) => { console.log(e.message); done(); if(onFail){onFail();} return; });
			q.on('end', () => { done(); callback(); });
		} else { console.log(err); if(onFail){onFail();} return; }
	});
};

exports.removeFromDB = function(sID) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', (err, client, done) => {
		if (!err) {
			var q = client.query('DELETE FROM ' + SERVER_DB_NAME + ' WHERE id = ' + sID);
			q.on('error', (e) => { console.log(e.message); done(); return; });
			q.on('end', () => { done(); });
		} else { console.log(err); return; }
	});
};