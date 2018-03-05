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
        teamFile: "./data/teams.nosql",
        playerFile: "./data/player.nosql",
        radarDataFile: "./data/radarData.nosql"
    }
    nconf.file('./configs/radarDatabaseConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings, options);

    if (objOptions.deviceId == undefined || objOptions.deviceId == '') {
        objOptions.deviceId = uuidv4();
        try {
            configFileSettings.deviceId = objOptions.deviceId;
            nconf.save();
            debug('Settings Saved');
        } catch (ex) {
            debug('setting save Error:' + ex);
        }
    }

    var teamDbExists = fs.existsSync(objOptions.teamFile);
    var playerDbExists = fs.existsSync(objOptions.playerFile);
    
    
    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        debug('radarDatabase Event Listener: ' + listener);
    });

    
    // db === Database instance <https://docs.totaljs.com/latest/en.html#api~Database>
    var teamDb = NoSQL.load(objOptions.teamFile);
    var playerDb = NoSQL.load(objOptions.playerFile);
    //var radarDataDb = NoSQL.load(objOptions.radarDataFile);



    this.team_getAll = function (callback) {
        teamDb.find().where("status",1).make(function (builder) {
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
        teamDb.update(team, team).make(function (builder) {
            //builder.between('age', 20, 30);
            builder.callback(function (err, count) {
                debug('team_upsert ', count);
                callback(err, count);
            });
        });                                            
    }

    this.team_delete = function (team, callback) {
        if (team.teamId) {
            teamDb.modify({ status: 0 }, false).where('id', team.id).make(function (builder) {
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

    this.player_upsert = function (player, callback) {
        if (!player.id) {
            player.id = uuidv4();
        }
        playerDb.update(player, player).make(function (builder) {
            builder.callback(function (err, count) {
                debug('player_upsert ', count);
                callback(err, count);
            });
        });  
    }
    this.player_getAll = function (callback) {
        playerDb.find().where("status", 1).make(function (builder) {
            builder.callback(function (err, response) {
                debug('player_getAll ', response);
                callback(err, response);
            });
        });
    }
    this.player_delete = function (player, callback) {
        if (player.playerId) {
            playerDb.modify({ status: 0 }, false).where('id', player.playerId).make(function (builder) {
                //builder.between('age', 20, 30);
                builder.callback(function (err, count) {
                    debug('player_delete ', count);
                    callback(err, count);
                });
            });
        } else {
            debug('player_delete no playerid');
        }
    }

    if (playerDbExists == false) {
        self.player_upsert({
            id: "00000000-0000-0000-0000-000000000000",
            firstName: "Anonymous",
            lastName: "Player",
            status: 1
        },
        function (err, callback) {
            debug("Anonymous Player Inserted");
        });
    }
    if (teamDbExists == false) {
        self.team_upsert({
            id: "00000000-0000-0000-0000-000000000000",
            status: 1,
            name: "Anonymous Team",
            players: [
                {
                    id: "00000000-0000-0000-0000-000000000000",
                    firstName: "Anonymous",
                    lastName: "Player"
                }
            ]
        },
        function (err, callback) {
            debug("Anonymous Player Inserted");
        });
    }
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarDatabase, EventEmitter);

module.exports = RadarDatabase;