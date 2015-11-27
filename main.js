var http = require('http'),
    fs = require('fs'),
    _ = require('lodash'),
    TelegramBot = require('node-telegram-bot-api'),
    rp = require('request-promise'),
    Firebase = require('firebase');

require('dotenv').load();

var voicerssToken = process.env.VOICERSS_TOKEN,
    telegramToken = process.env.TELEGRAM_TOKEN,
    locale = "en-gb",
    format = "48khz_16bit_stereo",
    rektList = '',
    bot = new TelegramBot(telegramToken, {polling: true}),
    fbref = new Firebase(process.env.FIREBASE_REF);
    chatsref = new Firebase(process.env.FIREBASE_REF + "chats");

console.log(voicerssToken, telegramToken);

rp('http://rawgit.com/seiyria/status-list/master/rekt-list.md')
    .then(function (htmlString) {
        rektList = htmlString.split('\n')
        rektList = _.slice(rektList, 1, rektList.length - 2);
    })
    .catch(function (err) {
        // Crawling failed...
    });

var fixText = function(text){
  var fixes = [ {bad:'[x]', good:''},
                {bad:'rekt', good:'rect'},
                {bad:'rekkit', good:'wreck it'},
                {bad:'-', good:' '},
              ]
  var text = text.toLowerCase();

  for (var change in fixes) {
    if (fixes.hasOwnProperty(change)) {
      text = text.split(fixes[change].bad).join(fixes[change].good);
    }
  }

  if (text.charCodeAt(8) == 178){
    text = text.split('²').join('') + ' squared ';
  }

  return text;
}


var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

//runs the bot gets send /rekt
bot.onText(/\/rekt/, function (msg, match) {
  var fromId = msg.chat.id;
  var currentText = _.sample(rektList);
  var text = fixText( currentText );
  var filename = 'cache/' + text.split(' ').join('')+ '.mp3';

  fbref.child('callcount').transaction(function(currentCount) {
    return currentCount+1;
  });

  chatsref.child(fromId).once('value', function(snapshot){
    var exists = (snapshot.val() !== null);
    if (!exists) {
      var tempRef = chatsref.child(fromId);
      tempRef.push({ checked:true });
      fbref.child('usercount').transaction(function(currentCount) {
        return currentCount+1;
      });
    }
  });

  //check if mp3 file already exists in cache. Saves using the api
  fs.stat(filename, function(err, stat) {
    if(err == null) {
      bot.sendMessage(fromId, currentText);
      bot.sendAudio(fromId, filename, {title:currentText});
    } else if(err.code == 'ENOENT') {
      download("http://api.voicerss.org/?key=" + voicerssToken +"&src=" + text +"&hl=" + locale +"&f=" + format, filename, function(){
        bot.sendMessage(fromId, currentText);
        bot.sendAudio(fromId, filename, {title:currentText});
      })
    } else {
        console.log('Some other error: ', err.code);
    }
});


});
