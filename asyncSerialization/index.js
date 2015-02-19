'use strict';

var rect = document.getElementById('rect'),
    transforms = {
        height: ['10vh', '20vh', '30vh', '40vh'],
        width: ['10vw', '20vw', '30vw', '40vw']
        //'background-color': ['red', 'blue', 'yellow', 'white', 'green']
    };

for(var prop in transforms){
    var i,len, val;
    if(!transforms.hasOwnProperty(prop)) continue;

    for(i=0;i < (len=transforms[prop].length);i++) {
        val = transforms[prop][i];
        Lib.add(window, changeProp, [rect, onEnd, prop, val], prop );
    }
    Lib.run(prop);
}

setTimeout(function(){
    //Lib.stop(function(){
    //    Lib.run('width', 3);
    //}, 'width');

    Lib.pause(function(){
        Lib.run('width');
    }, 'width');
}, 1000);

function onEnd(prop, val){
    this.style[prop] = val;
}

function changeProp(ctx, onEnd, prop, val){
    var timeout = Math.random() * 3000;
    setTimeout(function(args){
        onEnd(args[0], args[1]);
    }, timeout, [prop, val]);
}