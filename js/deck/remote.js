var option1 = document.querySelector('#option1'),
  option2 = document.querySelector('#option2'),
  disagree = document.querySelector('#disagree'),
  agree = document.querySelector('#agree'),
  voteLabel = document.querySelector('#vote-label'),
  voted,
  wsf = null;

if (!window['userObject'] || typeof userObject === 'undefined') {
  window.userObject = {name:'',email:'',org:'',pic:''};
}


function disablePoll(){
  option1.disabled = true;
  option2.disabled = true;
  option1.style.opacity = 0.2;
  option2.style.opacity = 0.2;
  voteLabel.innerHTML = 'Waiting...';
}


function sendVote(event,option){
  voted = true;
  if(option){
    wsf.sendText('vote:' + option + ',' + window.userObject.name + "," + window.userObject.email + ',' + new Date().getTime());
  }
  disablePoll();
  return false;
}

option1.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-option1', 'vote']);
  sendVote(event,option1.value);
  option1.value = 'Thanks for the input!';
  option2.value = 'Thanks for the input!';
  option2.style.display = 'none';
  return false;
};

option2.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-option2', 'vote']);
  sendVote(event,option2.value);
  option1.value = 'Thanks for the input!';
  option2.value = 'Thanks for the input!';
  option1.style.display = 'none';
  return false;
};



disagree.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-disagree', 'vote']);
  wsf.send('props:disagree' + ',' + window.userObject.name + "," + window.userObject.email + ',' + new Date().getTime());
  disagree.disabled = true;
  disagree.style.opacity = 0.4;
  disagree.value = "Waiting for next slide";
  return false;
};

agree.onclick = function(event) {
  _gaq.push(['_trackEvent', 'onslyde-agree', 'vote']);
  wsf.send('props:agree' + ',' + window.userObject.name + "," + window.userObject.email + ',' + new Date().getTime());
  agree.disabled = true;
  agree.style.opacity = 0.4;
  agree.value = "Waiting for next slide";
  return false;
};



function enablePoll(e){
  option1.disabled = false;
  option2.disabled = false;
  option1.style.display = '';
  option2.style.display = '';
  option1.value = e.option1;
  option2.value = e.option2;
  option1.style.opacity = 1;
  option2.style.opacity = 1;
  voteLabel.innerHTML = 'Vote!';
  voted = false;
}

function enableSentiment(){
  disagree.disabled = false;
  agree.disabled = false;
  disagree.value = 'Disagree';
  agree.value = 'Agree';
  disagree.style.opacity = 1;
  agree.style.opacity = 1;
}

window.addEventListener('updateOptions', function(e) {
  //quick check to make sure we don't re-enable on polling clients and disabling on null options
  if(e.option1 !== undefined && e.option1 !== 'null' && e.option2 !== 'null'){
    if((option1.value !== e.option1 && option2.value !== e.option2)){
      enablePoll(e);
      enableSentiment();
    }
  }else{
    disablePoll();
    enableSentiment();
  }


}, false);

window.addEventListener('remoteMarkup', function(e) {
  var markup = JSON.parse(e.markup);
  document.getElementById('from-slide').innerHTML = decodeURIComponent(markup.remoteMarkup);
}, false);


window.addEventListener('roulette', function(e) {
  var rouletteDiv = document.getElementById('roulette'),
    timer1,
    timer2;
  rouletteDiv.style.display = 'block';
  if(!e.winner){
    //simple state check for multiple raffles on the same session
    if(rouletteDiv.style.backgroundColor !== 'yellow'){
      rouletteDiv.innerHTML = "<p>calculating...</p>";
      timer1 = setTimeout(function(){rouletteDiv.innerHTML = "<p>sorry! maybe next time :)</p>";},5000);
    }

  }else if(e.winner){
    setTimeout(function(){
      rouletteDiv.style.backgroundColor = 'yellow';
      rouletteDiv.innerHTML = "<p>WINNER!!...</p>";
    },5000);
  }
}, false);


disablePoll();