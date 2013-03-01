var option1 = document.querySelector('#option1');
var option2 = document.querySelector('#option2');
var wtf = document.querySelector('#wtf');
var nice = document.querySelector('#nice');
var voteLabel = document.querySelector('#vote-label');
//todo make this unique user for session management/voter registration
//var ws = slidfast.ws.join('client:anonymous2');

disablePoll();

option1.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-option1', 'vote']);
  return sendVote(event,option1.value);
};

option2.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-option2', 'vote']);
  return sendVote(event,option2.value);
};

function sendVote(event,option){

  if(option){
    ws.send('vote:' + option);
  }
  disablePoll();
  return false;
}

wtf.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-wtf', 'vote']);
  ws.send('vote:wtf');
  wtf.disabled = true;
  wtf.style.opacity = .4;
  wtf.value = "you only get one per vote :)"
  return false;
};

nice.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-nice', 'vote']);
  ws.send('vote:nice');
  nice.disabled = true;
  nice.style.opacity = .4;
  nice.value = "you only get one per vote :)"
  return false;
};

function disablePoll(){
  option1.disabled = true;
  option2.disabled = true;
  option1.style.opacity = .4;
  option2.style.opacity = .4;
  //voteLabel.style.opacity = .4;
  voteLabel.innerHTML = 'Waiting...';
}

window.addEventListener('updateOptions', function(e) {
  //quick check to make sure we don't re-enable on polling clients
  if(option1.value != e.option1){
    option1.disabled = false;
    option2.disabled = false;
    wtf.disabled = false;
    nice.disabled = false;
    option1.value = e.option1;
    option2.value = e.option2;
    wtf.value = 'Thumbs Down!';
    nice.value = 'Nice!';
    //voteLabel.style.opacity = 1;
    option1.style.opacity = 1;
    option2.style.opacity = 1;
    wtf.style.opacity = 1;
    nice.style.opacity = 1;
    voteLabel.innerHTML = 'Vote!';
  }
}, false);

window.addEventListener('remoteMarkup', function(e) {
  var markup = jQuery.parseJSON(e.markup)
  document.getElementById('from-slide').innerHTML = decodeURIComponent(markup.remoteMarkup);
}, false);

function getParameterByName(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}