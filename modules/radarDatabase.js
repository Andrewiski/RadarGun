//lets setup the database
var fs = require("fs");
var file = "radarMonitor.db";
var exists = fs.existsSync(file);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);


var getInitTeamData = function(){
    db.each('select TeamID from Team where name="Unknown Team"', function(err,row){
        if (err != undefined){
            console.log(err);
        }
        var UnknownTeamID = row.TeamID
        radarSpeedRelatedData.VisitorTeamID = UnknownTeamID;
        radarSpeedRelatedData.HomeTeamID = UnknownTeamID;
        db.each('select GameID from Game where name="Unknown Game"', function(err,row){
            if (err != undefined){
                console.log(err);
            }
            radarSpeedRelatedData.GameID = row.GameID;
            db.each('select PlayerID from Player where FirstName = "Player 1" and LastName = "Player 1" and TeamID=' + UnknownTeamID , function(err,row){
                if (err != undefined){
                    console.log(err);
                }
                radarSpeedRelatedData.HitterPlayerID = row.PlayerID;
                radarSpeedRelatedData.PitcherPlayerID = row.PlayerID;
                radarSpeedDataStmt = db.prepare("INSERT INTO RadarData (Time, GameID, PitcherPlayerID, HitterPlayerID, LiveSpeedDirection, LiveSpeed, LiveSpeed2Direction, LiveSpeed2, PeakSpeedDirection,  PeakSpeed, PeakSpeedDirection2, PeakSpeed2, HitSpeedDirection, HitSpeed, HitSpeedDirection2, HitSpeed2) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
                DbInited = true;
            });
        });
      
      });
      
}

 var DbInited = false;

  if(!exists) {
    db.serialize(function() {
        db.run("CREATE TABLE Team (TeamID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, Name TEXT NOT NULL)");
        db.run("CREATE TABLE Game (GameID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, Time TEXT NOT NULL, HomeTeamID INTEGER NOT NULL, VisitorTeamID INTEGER NOT NULL, Name TEXT NOT NULL)");
        db.run("CREATE TABLE Player (PlayerID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, TeamID INTEGER NOT NULL, FirstName TEXT NOT NULL, LastName TEXT NOT NULL, PlayerNumber INTEGER NOT NULL)");
        db.run("CREATE TABLE RadarData (RadarDataID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, Time TEXT NOT NULL, GameID INTEGER NOT NULL, PitcherPlayerID INTEGER NOT NULL, HitterPlayerID INTEGER NOT NULL, LiveSpeedDirection TEXT NOT NULL,  LiveSpeed NUMERIC NOT NULL, LiveSpeed2Direction TEXT NOT NULL,  LiveSpeed2 NUMERIC NOT NULL, PeakSpeedDirection TEXT NOT NULL,  PeakSpeed NUMERIC NOT NULL, PeakSpeedDirection2 TEXT NOT NULL,  PeakSpeed2 NUMERIC NOT NULL, HitSpeedDirection TEXT NOT NULL,  HitSpeed NUMERIC NOT NULL, HitSpeedDirection2 TEXT NOT NULL,  HitSpeed2 NUMERIC NOT NULL )");
        db.run("INSERT INTO Team (Name) values (?)","Unknown Team");
        db.get('select seq from sqlite_sequence where name="Team"', function(err,row){
            db.run("INSERT INTO Game (Time, HomeTeamID, VisitorTeamID, Name) values (?,?,?,?)",new Date(2014,1,1,0,0,0,0),row.seq,row.seq,"Unknown Game");
            var stmt = db.prepare("INSERT INTO Player (TeamID, FirstName, LastName, PlayerNumber) values (?,?,?,?)");
            for (var i = 1; i < 13; i ++){
                stmt.run(row.seq, "Player " + i, "Player " + i, i);
            }
            stmt.finalize();
            getInitTeamData()    ;
            
            
                            
        });
    });
  }else{

      getInitTeamData()
  }