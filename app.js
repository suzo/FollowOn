// BASE SETUP 
// =============================================================================
// call the packages we need
var express = require('express'); // call express
var app = express(); // define our app using express
var bodyParser = require('body-parser');
var cors = require("cors");
var request = require("request");
var currentMatch = [];
app.use(bodyParser());
app.use(cors());
var firstInnings = "";
var scoresInfo = [];
var matchSchedule = {};
var fixtureData = [];
var pointsTable = {};
var liveMatches = [];

var port = process.env.PORT || 8080; // set our port

// routes to access data (accessed at GET http://localhost:8080/api)
app.get('/fixtures', function(req, res) {
    res.write(JSON.stringify(fixtureData));
    res.end();
});

app.get('/pointsTable', function(req, res) {
    res.write(JSON.stringify(pointsTable));
    res.end();
});

app.get('/score', function(req, res) {
    res.write(JSON.stringify(scoresInfo));
    res.end();
});

app.get('/current', function(req, res) {
    res.write(JSON.stringify(currentMatch));
    res.end();
});

app.get('/live', function(req, res) {
    res.write(JSON.stringify(liveMatches));
    res.end();
});
// more routes for our API will happen here


// START THE SERVER
app.listen(port);
console.log('Server started on ' + port);


var getTodaysMatches = function(data) {
    var todayMatches = [];
    var fixtures = [];
    if (data != {}) {
        if (data.tournamentId.name == "ipl2015") {
            var matchesArray = data.schedule;
            for (var i in matchesArray) {
                if (matchesArray[i].matchState == "L") {
                    todayMatches.push(matchesArray[i]);
                } else if (matchesArray[i].matchState == "U") {
                    fixtures.push(matchesArray[i]);
                }
            }
        }

        if (todayMatches != []) {
            liveMatches = todayMatches;
            getMatchInfo(todayMatches);
        } else if (liveMatches != []) {
            getMatchInfo(liveMatches);
        }
        getMatchFixtures(fixtures);
        // currentMatch = fixtures;
    }
}


var getMatchFixtures = function(data) {
    var temp = {};
    fixtureData = [];
    var days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    // calendarData = data;
    var zeroFill = function(date) {
        if (date < 10) {
            return '0' + date;
        } else {
            return date;
        }
    }

    for (var i in data) {
        var matchDate = data[i].matchDate;
        var utcTime = new Date(matchDate);
        temp.time = zeroFill(utcTime.getHours()) + ':' + zeroFill(utcTime.getMinutes()) + ' IST ' + zeroFill(utcTime.getUTCHours()) + ':' + zeroFill(utcTime.getUTCMinutes()) + ' GMT ';
        temp.m_date = days[utcTime.getDay()] + ', ' + zeroFill(utcTime.getDate()) + ' ' + months[utcTime.getMonth()];
        temp.description = data[i].description;
        //temp.team1 = data[i].team1.team.abbreviation;
        //temp.team2 = data[i].team2.team.abbreviation; 
        // if (data[i].groupName == "Playoffs") {
        temp.pool = data[i].groupName;
            if (data[i].team1 != undefined) {
                temp.team1 = data[i].team1.team.abbreviation;
            } else {
                temp.team1 = "";
            }

            if (data[i].team2 != undefined) {
                temp.team2 = data[i].team2.team.abbreviation;
            } else {
                temp.team2 = "";
            }
        // }
        temp.venue = data[i].venue.fullName + ", " + data[i].venue.city;
        fixtureData.push(temp);
        temp = {};
    }
}


var getMatchInfo = function(matches) {
    var matchDetails = [];
    if (matches != []) {
        for (var i in matches) {
            url = "http://datacdn.iplt20.com/dynamic/data/core/cricket/2012/ipl2015/" + matches[i].matchId.name + "/scoring.js";
            //url = "http://datacdn.iplt20.com/dynamic/data/core/cricket/2012/ipl2015/ipl2015-03/scoring.js";
            request(url, function (err, res, data) {
                var startPos = data.indexOf('({');
                var endPos = data.indexOf('})');
                var jsonString = data.substring(startPos + 1, endPos + 1);
                json = JSON.parse(jsonString);
                matchDetails.push(json);
                //currentMatch = json;
                 currentMatch.push(json);
                formatTheInfo(matchDetails);
            });
        }
     }
};


var formatTheInfo = function(data) {
    var temp = [];
    var inningsDetails = {
        "CurrentInnings": "",
        "Batting_Country": "",
        "Bowling_Country": "",
        "Score": {},
        "Crr": "",
        "facingBatsman": "",
        "nonFacingBatsman": "",
        "currentBowler": "",
        "target": "",
        "toWin": "",
        "match_status": "",
        "winningTeam": "",
        "Result": ""
    }
    data.forEach(function(each) {
        scoresInfo = [];

        if (each.matchInfo.battingOrder != undefined) {
         
            if (each.matchInfo.battingOrder[0] == each.currentState.currentInningsIndex) {
                battingOrder = "0";
                bowlingOrder = "1";
            } else {
                battingOrder = "1";
                bowlingOrder = "0";
            }


            var currentInningsIndex = each.currentState.currentInningsIndex;
            var battingTeamId = each.matchInfo.teams[battingOrder].team.id;
            var bowlingTeamId = each.matchInfo.teams[bowlingOrder].team.id;
            var overProgress = each.innings[currentInningsIndex].overProgress;
            var score = each.innings[currentInningsIndex].scorecard.runs + "/" + each.innings[currentInningsIndex].scorecard.wkts + " " + overProgress;
            var target = each.innings[0].scorecard.runs + 1;
            if (each.matchState != "C") {
                var targetRuns = target - each.innings[currentInningsIndex].scorecard.runs;
            }

            if (each.currentState.requiredRunRate) {
                var ballsRemaining = 120 - parseInt(parseInt(overProgress.split(".")[0]) * 6 + parseInt(overProgress.split(".")[1]));
            }
            if(currentInningsIndex == 1){
                inningsDetails.Score["0"] = firstInnings;
            }
            inningsDetails.CurrentInnings = currentInningsIndex;
            inningsDetails.Batting_Country = each.matchInfo.teams[battingOrder].team.abbreviation;
            inningsDetails.Bowling_Country = each.matchInfo.teams[bowlingOrder].team.abbreviation;
            inningsDetails.Score[currentInningsIndex] = score;
            if(currentInningsIndex == 0){
                firstInnings = score;
            }
            inningsDetails.Crr = each.innings[currentInningsIndex].runRate;

            var fbId = each.currentState.facingBatsman;
            var nonfbId = each.currentState.nonFacingBatsman;
            var bowlerId = each.currentState.currentBowler;
            var playerInfo = each.matchInfo.teams[battingOrder].players;
            var bowlingPlayerInfo = each.matchInfo.teams[bowlingOrder].players;
            var bInningsObject = each.innings[currentInningsIndex].scorecard.battingStats;
            var bowlerInningsObject = each.innings[currentInningsIndex].scorecard.bowlingStats;

            for (var j in playerInfo) {
                if (playerInfo[j].id == fbId) {
                    inningsDetails.facingBatsman = playerInfo[j].shortName;
                } else if (playerInfo[j].id == nonfbId) {
                    inningsDetails.nonFacingBatsman = playerInfo[j].shortName;
                }
            }

            for (var k in bowlingPlayerInfo) {
                if (bowlingPlayerInfo[k].id == bowlerId) {
                    inningsDetails.currentBowler = bowlingPlayerInfo[k].shortName;
                }
            }

            for (var l in bInningsObject) {
                if (bInningsObject[l].playerId == fbId) {
                    inningsDetails.facingBatsman = inningsDetails.facingBatsman + " " + bInningsObject[l].r + "(" + bInningsObject[l].b + ")";
                } else if (bInningsObject[l].playerId == nonfbId) {
                    inningsDetails.nonFacingBatsman = inningsDetails.nonFacingBatsman + " " + bInningsObject[l].r + "(" + bInningsObject[l].b + ")";
                }
            }

            for (var m in bowlerInningsObject) {
                if (bowlerInningsObject[m].playerId == bowlerId) {
                    inningsDetails.currentBowler = inningsDetails.currentBowler + " R-" + bowlerInningsObject[m].r + "  W-" + bowlerInningsObject[m].w;
                }
            }

            if (each.currentState.inProgress) {
                inningsDetails.match_status = "In Progress";
            } else {
                inningsDetails.match_status = "completed";
            }

            if (each.matchInfo.matchState == "C" && each.matchInfo.matchStatus != undefined) {
                inningsDetails.Result = each.matchInfo.matchStatus.text;
            }

            if (each.currentState.phase == "2") {
                inningsDetails.target = target;
                inningsDetails.toWin = targetRuns + " / " + ballsRemaining;
            }

            temp.push(inningsDetails);

        } else {
            inningsDetails.match_status = each.matchInfo.matchSummary;
            temp.push(inningsDetails);
        }

    });

    temp.forEach(function(eachMatch) {
        scoresInfo.push(eachMatch);
    })
    temp = [];
};


var init = function() {
    var emptyObj = {};
    request("http://datacdn.iplt20.com/dynamic/data/core/cricket/2012/ipl2015/matchSchedule2.js", function(err, res, data) {
        if (res) {
            var startPos = data.indexOf('({');
            var endPos = data.indexOf('})');
            var jsonString = data.substring(startPos + 1, endPos + 1);
            matchSchedule = JSON.parse(jsonString);
            getTodaysMatches(matchSchedule);
        } else {
            console.log("error");
            getTodaysMatches(emptyObj);
        }
    });
}


var getPoints = function() {
    request("http://datacdn.iplt20.com/dynamic/data/core/cricket/2012/ipl2015/groupStandings.js", function(err, res, data) {

        if (data) {
            var startPos = data.indexOf('({');
            var endPos = data.indexOf('})');
            var jsonString = data.substring(startPos + 1, endPos + 1);
            pointsJson = JSON.parse(jsonString);
            var temp = [];
            var temp2 = [{
                "groupName": "",
                "standings": []
            }, {
                "groupName": "",
                "standings": []
            }]

            for (var i in pointsJson.groups) {
                if (pointsJson.groups[i].groupName != "Knockouts") {
                    temp.push(pointsJson.groups[i]);
                }
            }

            for (var j in temp) {
                temp2[j].groupName = temp[j].groupName;
                for (var k in temp[j].standings) {
                    var details = {
                        "position": "",
                        "teamName": "",
                        "points": "",
                        "played": "",
                        "won": "",
                        "netRunRate": ""
                    };
                    details.position = temp[j].standings[k].position;
                    details.teamName = temp[j].standings[k].team.fullName;
                    details.points = temp[j].standings[k].points;
                    details.played = temp[j].standings[k].played;
                    details.won = temp[j].standings[k].won;
                    details.netRunRate = temp[j].standings[k].netRunRate;
                    temp2[j].standings.push(details);
                }
            }

            pointsTable = temp2;
        }

    });
};

var refresh = setInterval(init, 5000);
getPoints();

var refreshPoints = setInterval(getPoints, 1000 * 60 * 60);