//radarDatabase.js
//This Module will create a sqlite Database file for Logging DB events
//

var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('radarDatabase');
var nconf = require('nconf');
var fs = require("fs");
var NoSQL = require('nosql');
const uuidv4 = require('uuid/v4');
var path = require('path');
var RadarDatabase = function (options) {
    var self = this;
    var defaultOptions = {
        deviceId: "",
        teamsFile: "./data/teams.nosql",
        gamesFile: "./data/games.nosql",
        gamesFolder: "./data/games"
    }
    nconf.file('./configs/radarDatabaseConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings, options);

    if (objOptions.deviceId === undefined || objOptions.deviceId === '') {
        objOptions.deviceId = uuidv4();
        try {
            configFileSettings.deviceId = objOptions.deviceId;
            nconf.save();
            debug('Settings Saved');
        } catch (ex) {
            debug('setting save Error:' + ex);
        }
    }

    var teamsDbExists = fs.existsSync(objOptions.teamsFile);
    var gamesDbExists = fs.existsSync(objOptions.gamesFile);
    
    
    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        debug('radarDatabase Event Listener: ' + listener);
    });

    
    // db === Database instance <https://docs.totaljs.com/latest/en.html#api~Database>
    var teamsDb = NoSQL.load(objOptions.teamsFile);
    var gamesDb = NoSQL.load(objOptions.gamesFile);
    //var radarDataDb = NoSQL.load(objOptions.radarDataFile);



    this.team_getAll = function (callback) {
        teamsDb.find().where("status",1).make(function (builder) {
            builder.callback(function (err, response) {
                debug('team_getAll ', response);
                callback(err, response);
            });
        });
            
    }

    this.team_upsert = function (team, callback) {
        if (!team.id) {
            team.id = uuidv4();
        }
        teamsDb.update(team, team).make(function (filter) {
            filter.where('id', team.id);
            filter.callback(function (err, count, doc) {
                debug('team_upsert ', count);
                callback(err, count, doc);
            });
        });                                            
    }

    this.team_delete = function (team, callback) {
        if (team.teamId) {
            teamsDb.modify({ status: 0 }, false).where('id', team.id).make(function (builder) {
                //builder.between('age', 20, 30);
                builder.callback(function (err, count) {
                    debug('team_delete ', count);
                    callback(err, count);
                });
            });
        } else {
            debug('team_delete no teamid');
        }
        
        /*
          nosql.remove().make(function(builder) {
              // builder.first(); --> removes only one document
              builder.where('age', '<', 15);
              builder.callback(function(err, count) {
                  console.log('removed documents:', count);
              });
          });
        */
    }


    this.game_getAll = function (callback) {
        gamesDb.find().where("status", 1).make(function (builder) {
            builder.callback(function (err, response) {
                debug('game_getAll ', response);
                callback(err, response);
            });
        });

    }

    this.game_get = function (gameId, callback) {

        let gameFile = path.join(objOptions.gamesFolder, gameId, "game.nosql");
        
        if (fs.existsSync(gameFile)) {
            let gameDb = NoSQL.load(gameFile);
            gameDb.one().where("id", gameId).make(function (builder) {
                builder.callback(function (err, response) {
                    debug('game_get ', response);
                    callback(err, response);
                });
            });
        }

    }


    this.game_upsert = function (game, callback) {
        if (!game.id) {
            game.id = uuidv4();
        }

       

        if (fs.existsSync(objOptions.gamesFolder) === false) {
            fs.mkdirSync(objOptions.gamesFolder);
        }

        if (fs.existsSync(path.join(objOptions.gamesFolder, game.id)) === false) {
            fs.mkdirSync(path.join(objOptions.gamesFolder, game.id));
        }

        let gameFile = path.join(objOptions.gamesFolder, game.id, "game.nosql");
        

        let gameDb = NoSQL.load(gameFile);

        gameDb.update(game, game).make(function (filter) {
            filter.where('id', game.id);
            filter.callback(function (err, count) {
                debug('game_upsert ', count);
                let gameName = "";
                if (game.home && game.home.team && game.home.team.name) {
                    gameName += game.home.team.name + " vs ";
                }
                if (game.guest && game.guest.team && game.guest.team.name) {
                    gameName += game.guest.team.name;
                }
                if (gameName === "") {
                    gameName = game.id;
                }
                let gamesData = { id: game.id, name: gameName, startDate: game.startDate, endDate: game.endDate, status: game.status }
                gamesDb.update(gamesData, gamesData).make(function (filter) {
                    filter.where('id', gamesData.id);
                    filter.callback(function (err, count) {
                        debug('games_upsert ', count);
                        callback(err, count);
                    });
                });
            });
        });

        
    }

    this.game_delete = function (game, callback) {
        if (game.id) {
            teamsDb.modify({ status: 0 }, false).where('id', game.id).make(function (builder) {
                //builder.between('age', 20, 30);
                builder.callback(function (err, count) {
                    debug('game_delete ', count);
                    callback(err, count);
                });
            });
        } else {
            debug('game_delete no gameid');
        }

        /*
          nosql.remove().make(function(builder) {
              // builder.first(); --> removes only one document
              builder.where('age', '<', 15);
              builder.callback(function(err, count) {
                  console.log('removed documents:', count);
              });
          });
        */
    }

   

    if (gamesDbExists === false) {
        self.game_upsert(
            { "id": "00000000-0000-0000-0000-000000000000", "name": "New Game", "shortName": "", "startDate": null, "endDate": null, "inning": 1, "inningPosition": "top", "outs": 0, "balls": 0, "strikes": 0, "score": { "home": 0, "guest": 0 }, "home": { "lineup": [], "team": null }, "guest": { "lineup": [], "team": null }, "status": 1, "log": [] }    
        ,
        function (err, callback) {
            debug("Anonymous Game Inserted");
        });
    }
    if (teamsDbExists === false) {
        self.team_upsert({ "id": "00000000-0000-0000-0000-000000000000", "status": 1, "name": "New Team", "roster": [{ "firstName": "", "lastName": "", "jerseyNumber": "" }] },
        function (err, callback) {
            debug("Anonymous Game Inserted");
        });
    }
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarDatabase, EventEmitter);

module.exports = RadarDatabase;