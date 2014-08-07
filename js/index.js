angular.module('click-n-go', [
  'ui.bootstrap'
])
  .controller('AppController', ['$scope', function($scope){
  }])
  .directive('snapshot', ['$log', 'iMath', function($log, iMath){

    return {
      restrict: 'E',
      scope: {
        image: '='
      },
      templateUrl: 'templates/snapshot.html',
      link: function(scope, element, attrs){
        //--------------libcanvas
        var helper,
          count = 0,
          vector,
          circles = [],
          App = LibCanvas.App,
          Size = LibCanvas.Size,
          Circle = LibCanvas.Shapes.Circle,
          Polygon = LibCanvas.Shapes.Polygon;

        //---------------libcanvas

        var video = element.find('video').get(0),
          snapshot = element.find('canvas').get(0),
          corners = [],
          _canvas = document.createElement('canvas');
        if (!app.hasGetUserMedia()) {
          alert('getUserMedia() is not supported in your browser');
          return;
        }
        app.getVideoStream(function(stream){
          video.src = stream;
        });
        scope.test = 'from directive';
        scope.getSnapshot = function(){
          _canvas.height = video.videoHeight;
          _canvas.width = video.videoWidth;
          _canvas.getContext('2d').drawImage(video, 0, 0);
          initCanvas(_canvas);
          iMath.setSrc(_canvas);
        };

        scope.calcRect = function(){
          var rect = iMath.getRect(corners);
          var rect_canvas = $('canvas.rect').get(0);
          rect_canvas.width = rect.width;
          rect_canvas.height = rect.height;
          rect_canvas.getContext('2d').putImageData(rect, 0, 0);
        }

        function setPoint(e){
          var ctx = snapshot.getContext('2d'),
          point = iMath.getPosition(e),
            rect;
          corners.push(point);
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(point.x,point.y,4,4);
          if(corners.length >=4){
            alert('Points are set!');
            scope.setPoint = null;
            rect = iMath.getRect(corners);
            var rect_canvas = $('canvas.rect').get(0);
            rect_canvas.width = rect.width;
            rect_canvas.height = rect.height;
            rect_canvas.getContext('2d').putImageData(rect, 0, 0);
          }
        }
        function initCanvas(_canvas){
          if(!helper){
            atom.patching(window);
            helper = new App.Light(new Size(_canvas.width, _canvas.height), {appendTo:'.libcanvas-container'});
          }else{
            count = 0;
            corners = [];
            helper.mouse.events.removeAll('click');
            helper.app.container.size = new Size(_canvas.width, _canvas.height);
          }
          $('.libcanvas-container canvas').css({'background-image': 'url('+_canvas.toDataURL()+')'});

          helper.mouse.events.add( 'click', function () {
            var circle,
              quadraliteral,
              point = helper.mouse.point.clone();

            corners.push(point);
            ++count;
            circle = helper.createVector(new Circle(point, 2), { zIndex: 0 })
              .setStyle(               { fill: '#300', stroke: '#600' })
              .setStyle( 'hover' ,     { fill: '#600', stroke: '#900' })
              .setStyle( 'active',     { fill: '#060', stroke: '#090' });

            circle.clickable.start();
            circle.draggable.start();
            circles.push(circle);

            if(count == 4){
              helper.mouse.events.removeAll('click');
              corners = iMath.sortRectCorners(corners);
              quadraliteral = new Polygon(corners);
              vector = helper.createVector(quadraliteral)
                .setStyle({ opacity: 0.1, fill: '#000', stroke: '#600' })
                .setStyle( 'hover' ,     { stroke: '#900' })
                .setStyle( 'active',     { stroke: '#090' });

              vector.zIndex = 0;
              vector.clickable.start();
              vector.draggable.start();
              scope.calcRect();

              for(i=0; i<4; i++){
                circles[i].events.add('mouseup', function(){
                  scope.calcRect();
                });
              }
            }
          });
        }
      }
    };
  }])
;