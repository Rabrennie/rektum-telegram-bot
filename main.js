var http = require('http'),
    fs = require('fs'),
    _ = require('lodash'),
    TelegramBot = require('node-telegram-bot-api'),
    rp = require('request-promise')

require('dotenv').load();

var voicerssToken = process.env.VOICERSS_TOKEN,
    telegramToken = process.env.TELEGRAM_TOKEN,
    locale = "en-gb",
    format = "48khz_16bit_stereo",
    rektList = '',
    bot = new TelegramBot(telegramToken, {polling: true});

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
  var text = text;

  text = text.split('[x]').join('');

  //tts works better with rect :(
  text = text.split('REKT').join('rect');

  //temporary fixes
  text = text.split('rekkit').join('wreck it');
  text = text.split('-').join(' ');

  if (text.charCodeAt(8) == 178){
    text = text.split('²').join('') + ' squared ';
  }

  text = text.toLowerCase();

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
