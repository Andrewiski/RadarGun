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
var RadarDatabase = function (options) {
    var self = this;
    var defaultOptions = {
        deviceId: "",
        teamsFile: "./data/teams.nosql",
        gamesFile: "./data/games.nosql"
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

    this.game_upsert = function (game, callback) {
        if (!game.id) {
            game.id = uuidv4();
        }
        gamesDb.update(game, game).make(function (builder) {
            //builder.between('age', 20, 30);
            builder.callback(function (err, count) {
                debug('game_upsert ', count);
                callback(err, count);
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
            { "id": "00000000-0000-0000-0000-000000000001", "name": "New Game", "date": "", "home": "", "guest": "", "status": 1 }    
        ,
        function (err, callback) {
            debug("Anonymous Game Inserted");
        });
    }
    if (teamsDbExists === false) {
        self.team_upsert({
            "id": "00000000-0000-0000-0000-000000000001",
            "status": 1,
            "name": "Vicksburg Bulldogs Varsity",
            "roster": [
                {
                    "firstName": "Cole",
                    "lastName": "Gebben",
                    "jerseyNumber": "1",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Jacob",
                    "lastName": "Conklin",
                    "jerseyNumber": "2",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Zach",
                    "lastName": "Myers",
                    "jerseyNumber": "4",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Tyler",
                    "lastName": "DeVries",
                    "jerseyNumber": "5",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Ben",
                    "lastName": "Hackman",
                    "jerseyNumber": "6",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Jimmy",
                    "lastName": "Cutshaw",
                    "jerseyNumber": "7",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Logan",
                    "lastName": "Cohrs",
                    "jerseyNumber": "8",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Brenden",
                    "lastName": "Monroe",
                    "jerseyNumber": "9",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Brenden",
                    "lastName": "Owen",
                    "jerseyNumber": "10",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Carter",
                    "lastName": "Brown",
                    "jerseyNumber": "11",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Parker",
                    "lastName": "Wilson",
                    "jerseyNumber": "12",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Dylan",
                    "lastName": "Zemitans",
                    "jerseyNumber": "13",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Drew",
                    "lastName": "Habel",
                    "jerseyNumber": "14",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Trevor",
                    "lastName": "Young",
                    "jerseyNumber": "15",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Evan",
                    "lastName": "Anderson",
                    "jerseyNumber": "18",
                    "fielding": 99,
                    "batting": 99
                },
                {
                    "firstName": "Colin",
                    "lastName": "Klinger",
                    "jerseyNumber": "22",
                    "fielding": 99,
                    "batting": 99
                }
            ]
        },
        function (err, callback) {
            debug("Anonymous Game Inserted");
        });
    }
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarDatabase, EventEmitter);

module.exports = RadarDatabase;