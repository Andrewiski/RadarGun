//radarDatabase.js
//This Module will create a sqlite Database file for Logging DB events
//
const appLogName = "radarDatabase";
const util = require('util');
const extend = require('extend');
const EventEmitter = require('events').EventEmitter;

const fs = require("fs");
const NoSQL = require('nosql');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
var RadarDatabase = function (options, logUtilHelper, dataDirectory, deviceId) {
    var self = this;
    var defaultOptions = {
        "teamsFile": "teams.nosql",
        "gamesFile": "games.nosql",
        "playersFile": "player.nosql",
        "radarDataFile": "radarData.nosql"
    }
    
    var objOptions = extend({}, defaultOptions, options);

    

    const nosqlDataDirectory = path.join(dataDirectory,"nosql");
    if(fs.existsSync(nosqlDataDirectory) === false){
        fs.mkdirSync(nosqlDataDirectory,{recursive:true})
    };
    

    var teamsFilePath = path.join(nosqlDataDirectory, objOptions.teamsFile);
    var gamesFilePath = path.join(nosqlDataDirectory, objOptions.gamesFile);
    var gamesFolderPath = path.join(nosqlDataDirectory, "games");

    var teamsDbExists = fs.existsSync(teamsFilePath);
    var gamesDbExists = fs.existsSync(gamesFilePath);
    
    
    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        logUtilHelper.log(appLogName, "app", "debug", 'radarDatabase Event Listener: ' + listener);
    });

    
    // db === Database instance <https://docs.totaljs.com/latest/en.html#api~Database>
    var teamsDb = NoSQL.load(teamsFilePath);
    var gamesDb = NoSQL.load(gamesFilePath);
    //var radarDataDb = NoSQL.load(objOptions.radarDataFile);



    this.team_getAll = function (callback) {
        teamsDb.find().where("status",1).make(function (builder) {
            builder.callback(function (err, response) {
                logUtilHelper.log(appLogName, "app", "debug", 'team_getAll ', response);
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
                logUtilHelper.log(appLogName, "app", "debug", "team_upsert", count);
                callback(err, count, doc);
            });
        });                                            
    }

    this.team_delete = function (team, callback) {
        if (team.teamId) {
            teamsDb.modify({ status: 0 }, false).where('id', team.id).make(function (builder) {
                //builder.between('age', 20, 30);
                builder.callback(function (err, count) {
                    logUtilHelper.log(appLogName, "app", "debug", 'team_delete', count);
                    callback(err, count);
                });
            });
        } else {
            logUtilHelper.log(appLogName, "app", "error", 'team_delete no teamid');
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
                logUtilHelper.log(appLogName, "app", "debug", 'game_getAll', response);
                callback(err, response);
            });
        });

    }

    this.game_get = function (gameId, callback) {

        let gameFile = path.join(gamesFolderPath, gameId, "game.nosql");
        
        if (fs.existsSync(gameFile)) {
            let gameDb = NoSQL.load(gameFile);
            gameDb.one().where("id", gameId).make(function (builder) {
                builder.callback(function (err, response) {
                    logUtilHelper.log(appLogName, "app", "debug", 'game_get ', response);
                    callback(err, response);
                });
            });
        }

    }

    this.game_upsert = function (game, callback) {
        if (!game.id) {
            game.id = uuidv4();
        }

        if (fs.existsSync(gamesFolderPath) === false) {
            fs.mkdirSync(gamesFolderPath);
        }

        if (fs.existsSync(path.join(gamesFolderPath, game.id)) === false) {
            fs.mkdirSync(path.join(gamesFolderPath, game.id));
        }

        let gameFile = path.join(gamesFolderPath, game.id, "game.nosql");

        let gameDb = NoSQL.load(gameFile);

        gameDb.update(game, game).make(function (filter) {
            filter.where('id', game.id);
            filter.callback(function (err, count) {
                logUtilHelper.log(appLogName, "app", "debug", 'game_upsert', count);
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
                        logUtilHelper.log(appLogName, "app", "debug", 'games_upsert', count);
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
                    logUtilHelper.log(appLogName, "app", "debug", 'game_delete', count);
                    callback(err, count);
                });
            });
        } else {
            logUtilHelper.log(appLogName, "app", "error", 'game_delete no gameid');
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
            logUtilHelper.log(appLogName, "app", "debug", "Anonymous Game Inserted");
        });
    }
    if (teamsDbExists === false) {
        self.team_upsert({ "id": "00000000-0000-0000-0000-000000000000", "status": 1, "name": "New Team", "roster": [{ "firstName": "", "lastName": "", "jerseyNumber": "" }] },
        function (err, callback) {
            logUtilHelper.log(appLogName, "app", "debug", "Anonymous Game Inserted");
        });
    }
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarDatabase, EventEmitter);

module.exports = RadarDatabase;