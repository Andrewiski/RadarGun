"use strict";
const debug = require('debug')('remoteDBServer');
const extend = require('extend');
const Defer = require('node-promise').defer;
const Logger = require("./logger.js");
var MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
const assert = require('assert');


var remoteDBServer = function (options) {
    var self = this;
    var defaultOptions = {
        mongoDbServerUrl: "",
        mongoDbDatabaseName:""
    };
    var objOptions = extend({}, defaultOptions, options);
    self.objOptions = objOptions;
    self.appLogger = null;
    self.cache = {};
    var appLogHandler = function (logData) {
        //add to the top of the
        privateData.logs.push(logData);

        if (privateData.logs.length > objOptions.maxLogLength) {
            privateData.logs.shift();
        }
        var debugArgs = [];
        //debugArgs.push(logData.timestamp);
        debugArgs.push(logData.logLevel);
        for (let i = 0; i < logData.args.length; i++) {
            debugArgs.push(logData.args[i]);
        }
        debug(appLogger.arrayPrint(debugArgs));
    }
    if (objOptions.enableLog) {
        self.appLogger = new Logger({
            logLevel: objOptions.logLevel,
            logName: "deapirequesthandler",
            logEventHandler: appLogHandler,
            logFolder: objOptions.logDirectory
        })
    }

    var writeToLog = function (loglevel) {

        if (self.appLogger) {
            self.appLogger(arguments);
        } else {
            let args = []
            for (let i = 0; i < arguments.length; i++) {
                if (arguments[i] === undefined) {
                    args.push("undefined");
                } else if (arguments[i] === null) {
                    args.push("null");
                }
                else {
                    args.push(JSON.parse(JSON.stringify(arguments[i])))
                }

            }
            debug(args);
        }
    };


    var BindRoutes = function (routes) {
        
        try {

            routes.get('/data/server/games', getGames);
            routes.get('/data/server/teams', getTeams);
            routes.get('/data/server/team/:id', getTeamByTeamId);
            routes.put('/data/server/team/:id', putTeamByTeamId);
            routes.put('/data/server/game/:id', putGameByGameId);
            routes.get('/data/server/game/:id', getGameByGameId);
            

        } catch (ex) {
            res.status(500).json({ "msg": "An Error Occured!", "error": ex });
        }
        
    }

    

    var getGames = function (req, res) {
        try {
            const client = new MongoClient(objOptions.mongoDbServerUrl);
            // Use connect method to connect to the Server
            client.connect(function (err, client) {
                try {
                    assert.equal(null, err);
                    const db = client.db(objOptions.mongoDbDatabaseName);
                    const collection = db.collection('games');
                    var findQuery = { status: 1 };
                    var projections = { id: 1, name: 1, startDate: 1, endDate: 1, status };
                    var sort = [['startDate', 1]];
                    if (collection) {
                        collection.find(findQuery)
                            .project(projections)
                            .sort(sort)
                            .toArray(
                                function (err, docs) {
                                    assert.equal(err, null);
                                    res.json(docs);
                                    client.close();
                                });
                    } else {
                        return null;
                    }
                } catch (ex) {
                    res.status(500).json({ "msg": "An Error Occured!", "error": ex });
                    client.close();
                }
            });
        } catch (ex) {
            res.status(500).json({ "msg": "An Error Occured!", "error": ex });
        }

    };



    var getGame = function (req, res) {
        try {
            findGameByGameId(req.id).then(
                function (game) {
                    res.json(game); 
                }
            )
               
        } catch (ex) {
            res.status(500).json({ "msg": "An Error Occured!", "error": ex });
        }

    };
    

    var putGameByGameId = function (req, res) {
        try {
            res.json(game);
        } catch (ex) {
            res.status(500).json({ "msg": "An Error Occured!", "error": ex });
        }
    }

    var findGameByGameId = function (options) {
        let deferred = Defer();
        try {
            const client = new MongoClient(objOptions.mongoDbServerUrl);
            // Use connect method to connect to the Server
            client.connect(function (err, client) {
                try {
                    assert.equal(null, err);
                    const db = client.db(objOptions.mongoDbDatabaseName);
                    const collection = db.collection('games');
                    var findQuery = { id: options.id };
                    if (collection) {
                        collection.findOne(findQuery)
                            .then(
                                function (doc) {
                                    deferred.resolve(doc);
                                },
                                function (err) {
                                    deferred.reject({ "msg": "An Error Occured!", "error": err });
                                },
                            );
                    } else {
                        deferred.reject({ "msg": "Collection Not Found!", "error": err });
                    }
                } catch (ex) {
                    deferred.reject({ "msg": "An Error Occured!", "error": ex });
                }
            });
        } catch (ex) {
            deferred.reject({ "msg": "An Error Occured!", "error": ex });
        }
        return deferred.promise;
    };

    var putGameByGameId = function (options) {
        let deferred = Defer();
        try {
            const client = new MongoClient(objOptions.mongoDbServerUrl);
            // Use connect method to connect to the Server
            client.connect(function (err, client) {
                try {
                    assert.equal(null, err);
                    const db = client.db(objOptions.mongoDbDatabaseName);
                    const collection = db.collection('games');
                    if (collection) {
                        var findQuery = { id: options.id };
                        collection.updateOne(findQuery, options.game, {upsert:true})
                            .then(
                                function (result) {
                                    deferred.resolve(options.game);
                                },
                                function (err) {
                                    deferred.reject({ "msg": "An Error Occured!", "error": err });
                                },
                            );
                    } else {
                        deferred.reject({ "msg": "Collection Not Found!", "error": err });
                    }
                } catch (ex) {
                    deferred.reject({ "msg": "An Error Occured!", "error": ex });
                }
            });
        } catch (ex) {
            deferred.reject({ "msg": "An Error Occured!", "error": ex });
        }
        return deferred.promise;
    };


    

    self.bindRoutes = BindRoutes;
    self.getGameByGameId = getGameByGameId;
    self.putGameByGameId = putGameByGameId;
    self.putTeamByTeamId = putTeamByTeamId;
    
};
module.exports = remoteDBServer;