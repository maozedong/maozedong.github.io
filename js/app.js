app = {
  videoUrl: null,
  hasGetUserMedia:function() {
    // Note: Opera builds are unprefixed.
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia);
  },
  getVideoStream: function(fn){
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    // Not showing vendor prefixes.
    navigator.getUserMedia({'video':true}, function(localMediaStream) {
      app.videoUrl = window.URL.createObjectURL(localMediaStream);
      fn(app.videoUrl);
    }, app.log);
  },
  getPosition: function(event)
{
  var x, y,
    canvas = event.target;
  if (event.x != undefined && event.y != undefined)
  {
    x = event.x;
    y = event.y;
  }
  else // Firefox method to get the position
  {
    x = event.clientX + document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y = event.clientY + document.body.scrollTop +
      document.documentElement.scrollTop;
  }
  x -= canvas.offsetLeft;
  y -= canvas.offsetTop;
  return {x:x, y:y};
},
  log: function(){
    if(console){
      for(var i in arguments){
        if(arguments.hasOwnProperty(i)){
          console.log(arguments[i]);
        }
      }
    }
  }
};
