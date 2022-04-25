"use strict";
const appLogName = "remoteMongoDBServer";
//const debug = require('debug')('remoteDBServer');
const extend = require('extend');
const Defer = require('node-promise').defer;
const Logger = require("./logger.js");
var MongoClient = require('mongodb').MongoClient;
var moment = require('moment');
const assert = require('assert');


var remoteMongoDBServer = function (options, logUtilHelper) {
    var self = this;
    var defaultOptions = {
        mongoDbServerUrl: "",
        mongoDbDatabaseName:""
    };
    var objOptions = extend({}, defaultOptions, options);
    self.options = objOptions;
    var BindRoutes = function (routes) {
        
        try {

            routes.get('/data/server/games', getGames);
            routes.get('/data/server/teams', getTeams);
            routes.get('/data/server/team/:id', getTeamByTeamId);
            routes.put('/data/server/team/:id', putTeamByTeamId);
            routes.put('/data/server/game/:id', putGameByGameId);
            routes.get('/data/server/game/:id', getGameByGameId);
            

        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "BindRoutes", ex);
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
                    logUtilHelper.log(appLogName, "app", "error", "getGames", ex);
                    res.status(500).json({ "msg": "An Error Occured!", "error": ex });
                    client.close();
                }
            });
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "getGames", ex);
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
            logUtilHelper.log(appLogName, "app", "error", "getGame", ex);
            res.status(500).json({ "msg": "An Error Occured!", "error": ex });
        }

    };
    

    var putGameByGameId = function (req, res) {
        try {
            logUtilHelper.log(appLogName, "app", "debug", "putGameByGameId", result);
            res.json(game);
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "putGameByGameId", ex);
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
                                    logUtilHelper.log(appLogName, "app", "debug", "findGameByGameId", doc);
                                    deferred.resolve(doc);
                                },
                                function (err) {
                                    logUtilHelper.log(appLogName, "app", "error", "findGameByGameId", err);
                                    deferred.reject({ "msg": "An Error Occured!", "error": err });
                                },
                            );
                    } else {
                        logUtilHelper.log(appLogName, "app", "error", "findGameByGameId", "Collection Not Found!", err);
                        deferred.reject({ "msg": "Collection Not Found!", "error": err });
                    }
                } catch (ex) {
                    logUtilHelper.log(appLogName, "app", "error", "findGameByGameId", ex);
                    deferred.reject({ "msg": "An Error Occured!", "error": ex });
                }
            });
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "findGameByGameId", ex);
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
                                    logUtilHelper.log(appLogName, "app", "debug", "putGameByGameId", result);
                                    deferred.resolve(options.game);
                                },
                                function (err) {
                                    logUtilHelper.log(appLogName, "app", "error", "putGameByGameId", err);
                                    deferred.reject({ "msg": "An Error Occured!", "error": err });
                                },
                            );
                    } else {
                        logUtilHelper.log(appLogName, "app", "error", "putGameByGameId", err);
                        deferred.reject({ "msg": "Collection Not Found!", "error": err });
                    }
                } catch (ex) {
                    logUtilHelper.log(appLogName, "app", "error", "putGameByGameId", ex);
                    deferred.reject({ "msg": "An Error Occured!", "error": ex });
                }
            });
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "putGameByGameId", ex);
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