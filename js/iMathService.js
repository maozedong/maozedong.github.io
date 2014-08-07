angular.module('click-n-go')
  .service('iMath', [function(){

  var src,
    self = this;

    function Point(x,y){
      this.x = x;
      this.y = y;
    }

    function createPoint(x, y){
      return new Point(x, y);
    }

    function setSrc(canvas){
      self.src = {
        data: canvas.getContext('2d').getImageData(0,0,canvas.width, canvas.height),
        width: canvas.width,
        height: canvas.height
      };
    }

    function getImageData() {
      return self.src.data;
    }

    function getRect(corners){
    var width, height;
    var math = new CoordsMather(corners);
    var principalPoint = new Point(self.src.width/2, self.src.height/2);
    var aspectRatio = getRectAspectRatio(principalPoint, corners);
    if(math.getMaxWidth() > math.getMaxHeight()){
      width = math.getMinWidth();
      height = Math.floor(width/aspectRatio);
    }else{
      height = math.getMinHeight();
      width = Math.floor(height*aspectRatio);
    }

    var dept, v1, v2, l, map, stepx, stepy;
    if(width >= height){
      dept = Math.round(Math.log(width)/Math.LN2);
    }else{
      dept = Math.round(Math.log(height)/Math.LN2);
    }
    v1 = math.intersect(math.a, math.b);
    v2 = math.intersect(math.c, math.d);
    l = Math.pow(2, dept);
    map = (function(){ var map=[];for(var i=0; i<l;i++){map.push([])}return map;})();
    stepx = l/width;
    stepy = l/height;
    var _set = {
      v1: v1,
      v2:v2,
      dept: dept,
      map: map,
      math: math
    }
    setCoordMap(corners, _set, 0, []);

    var _y, _x, colors;
    var index = 0;
    var rect = document.createElement('canvas').getContext('2d').createImageData(width, height);
    for (var y = 0; y < l; y+=stepy) {
      _y = Math.round(y);
      if(_y>=l) break;
      for (var x = 0; x < l; x+=stepx) {
        _x = Math.round(x);
        if(_x>=l) break;
        colors = getColorsForPoint(self.src.data, _set.map[_y][_x]);
        rect.data[index] = colors[0];
        rect.data[index+1] = colors[1];
        rect.data[index+2] = colors[2];
        rect.data[index+3] = colors[3];
        index += 4;
      }
    }

    return rect;
  }

    function getIndex(path){
      var i,index = {col:0, row:0}, pow = path.length, _pow;
      for(i in path){
        if(!path.hasOwnProperty(i)) continue;
        _pow = pow-(1+Number(i));
        switch(path[i]){
          case 0:
            break;
          case 1:
            index.col = index.col + Math.pow(2, _pow);
            break;
          case 2:
            index.row = index.row + Math.pow(2, _pow);
            break;
          case 3:
            index.col = index.col + Math.pow(2, _pow);
            index.row = index.row + Math.pow(2, _pow);
            break;
        }
      }
      return index;
    }

    function getColorsForPoint( img, point ){
      var w = img.width;
      var h = img.height;

      var start = (4 * (Math.round(point.x) + Math.round(point.y) * w));

      return [ img.data[start], img.data[start + 1], img.data[start + 2], img.data[start + 3] ];
    }

    function setCoordMap(src, settings, i, path){
      var o, i1, i2, i3, i4;
      o = settings.math.intersect([src[0], src[2]], [src[1], src[3]]);
      if(i<settings.dept){
        i1 = settings.math.intersect([o, settings.v1], [src[0], src[3]]);//line c
        i2 = settings.math.intersect([o, settings.v2], [src[3], src[2]]);//line b
        i3 = settings.math.intersect([o, settings.v1], [src[1], src[2]]);//line d
        i4 = settings.math.intersect([o, settings.v2], [src[0], src[1]]);//line a

        setCoordMap([src[0], i4, o, i1], settings, i+1, path.concat([0]));
        setCoordMap([i4, src[1], i3, o], settings, i+1, path.concat([1]));
        setCoordMap([i1, o, i2, src[3]], settings, i+1, path.concat([2]));
        setCoordMap([o, i3, src[2], i2], settings, i+1, path.concat([3]));
      }else{
        var index = getIndex(path);
        settings.map[index.row][index.col] = o;
      }
    }

    //http://stackoverflow.com/questions/1194352/proportions-of-a-perspective-deformed-rectangle
    function getRectAspectRatio(principalPoint, corners){
    var c,k2,k3,whRatio;
    c = [{}, {}, {}, {}];
    //equations use another order of corners
    c[0].x = corners[0].x - principalPoint.x;
    c[0].y = corners[0].y - principalPoint.y;
    c[1].x = corners[1].x - principalPoint.x;
    c[1].y = corners[1].y - principalPoint.y;
    c[2].x = corners[3].x - principalPoint.x;
    c[2].y = corners[3].y - principalPoint.y;
    c[3].x = corners[2].x - principalPoint.x;
    c[3].y = corners[2].y - principalPoint.y;

    k2 =
      (
        (c[0].y - c[3].y)*c[2].x - (c[0].x - c[2].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[2].x
        )/
        (
          (c[1].y - c[3].y)*c[2].x - (c[1].x - c[2].x)*c[2].y
            + c[1].x*c[3].y - c[1].y*c[2].x
          );

    k3 = (
      (c[0].y - c[3].y)*c[1].x - (c[0].x - c[2].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[2].x
      ) /
      (
        (c[2].y - c[3].y)*c[1].x - (c[2].x - c[2].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[2].x
        ) ;

    if ((k2==1 && k3==1)|| (k2+k3 == Infinity) || isNaN(k2+k3)) {
      whRatio = Math.sqrt(
        (Math.pow(c[1].y-c[0].y, 2) + Math.pow(c[1].x-c[0].x, 2))/
          (Math.pow(c[2].y-c[0].y, 2) + Math.pow(c[2].x-c[0].x, 2))
      );
    }else{
      whRatio = Math.sqrt(((((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) -
        1)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)/((c[1].y -
        c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - 1)*Math.pow((((c[0].y -
        c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].y/((c[1].y - c[3].y)*c[2].x
        - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].y),2)/((((c[0].y - c[3].y)*c[1].x -
        (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].y/((c[2].y - c[3].y)*c[1].x - (c[2].x -
        c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].y)*(((c[0].y - c[3].y)*c[2].x - (c[0].x -
        c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].y/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y
        + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].y) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y +
        c[0].x*c[3].y - c[0].y*c[3].x)*c[2].x/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y
        - c[2].y*c[3].x) - c[0].x)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y -
        c[0].y*c[3].x)*c[1].x/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x)
        - c[0].x)) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) -
        1)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)/((c[1].y -
        c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - 1)*Math.pow((((c[0].y -
        c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].x/((c[1].y - c[3].y)*c[2].x
        - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].x),2)/((((c[0].y - c[3].y)*c[1].x -
        (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].y/((c[2].y - c[3].y)*c[1].x - (c[2].x -
        c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].y)*(((c[0].y - c[3].y)*c[2].x - (c[0].x -
        c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].y/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y
        + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].y) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y +
        c[0].x*c[3].y - c[0].y*c[3].x)*c[2].x/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y
        - c[2].y*c[3].x) - c[0].x)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y -
        c[0].y*c[3].x)*c[1].x/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x)
        - c[0].x)) - Math.pow((((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) -
        1),2))/((((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) -
        1)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)/((c[1].y -
        c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - 1)*Math.pow((((c[0].y -
        c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].y/((c[2].y - c[3].y)*c[1].x
        - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].y),2)/((((c[0].y - c[3].y)*c[1].x -
        (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].y/((c[2].y - c[3].y)*c[1].x - (c[2].x -
        c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].y)*(((c[0].y - c[3].y)*c[2].x - (c[0].x -
        c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].y/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y
        + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].y) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y +
        c[0].x*c[3].y - c[0].y*c[3].x)*c[2].x/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y
        - c[2].y*c[3].x) - c[0].x)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y -
        c[0].y*c[3].x)*c[1].x/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x)
        - c[0].x)) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) -
        1)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)/((c[1].y -
        c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x) - 1)*Math.pow((((c[0].y -
        c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].x/((c[2].y - c[3].y)*c[1].x
        - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].x),2)/((((c[0].y - c[3].y)*c[1].x -
        (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[2].y/((c[2].y - c[3].y)*c[1].x - (c[2].x -
        c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) - c[0].y)*(((c[0].y - c[3].y)*c[2].x - (c[0].x -
        c[3].x)*c[2].y + c[0].x*c[3].y - c[0].y*c[3].x)*c[1].y/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y
        + c[1].x*c[3].y - c[1].y*c[3].x) - c[0].y) + (((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y +
        c[0].x*c[3].y - c[0].y*c[3].x)*c[2].x/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y
        - c[2].y*c[3].x) - c[0].x)*(((c[0].y - c[3].y)*c[2].x - (c[0].x - c[3].x)*c[2].y + c[0].x*c[3].y -
        c[0].y*c[3].x)*c[1].x/((c[1].y - c[3].y)*c[2].x - (c[1].x - c[3].x)*c[2].y + c[1].x*c[3].y - c[1].y*c[3].x)
        - c[0].x)) - Math.pow((((c[0].y - c[3].y)*c[1].x - (c[0].x - c[3].x)*c[1].y + c[0].x*c[3].y -
        c[0].y*c[3].x)/((c[2].y - c[3].y)*c[1].x - (c[2].x - c[3].x)*c[1].y + c[2].x*c[3].y - c[2].y*c[3].x) -
        1), 2)));
    }
    return whRatio;
  }

    function getPosition(event) {
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
      return new Point(x, y);
    }


    var CoordsMather = function( points ){
      points = this.sortRectCorners(points);
      var a1 = points[0],
        a2 = points[1],
        b1 = points[3],
        b2 = points[2];

      this.a = [a1, a2];
      this.b = [b1, b2];
      this.c = [a1, b1];
      this.d = [a2, b2];
    }

    CoordsMather.prototype.getPointOnLine = function(line, percentage){
      xslope = line[1].x - line[0].x;
      yslope = line[1].y - line[0].y;

      return { x: line[0].x + xslope*percentage, y: line[0].y + yslope*percentage };
    }

    CoordsMather.prototype.getPointInQuad = function(xpercentage, ypercentage){
      var point1, point2, result;
      point1 = this.getPointOnLine(this.a, xpercentage);
      point2 = this.getPointOnLine(this.b, xpercentage);

      return this.getPointOnLine([point1, point2], ypercentage);
    }

    CoordsMather.prototype.getLineLength = function(line){
      return Math.sqrt( Math.pow(line[1].x - line[0].x, 2) + Math.pow(line[1].y - line[0].y, 2));
    }

    CoordsMather.prototype.getMaxWidth = function(){
      return Math.floor(Math.max( this.getLineLength( this.a ), this.getLineLength( this.b )));
    }

    CoordsMather.prototype.getMaxHeight = function(){
      return Math.floor(Math.max( this.getLineLength( this.c ), this.getLineLength( this.d )));
    }

    CoordsMather.prototype.getMinWidth = function(){
      return Math.floor(Math.min( this.getLineLength( this.a ), this.getLineLength( this.b )));
    }

    CoordsMather.prototype.getMinHeight = function(){
      return Math.floor(Math.min( this.getLineLength( this.c ), this.getLineLength( this.d )));
    }

    CoordsMather.prototype.getMassCenter = function(corners){
      var center = {x:0,y:0}, i;
      for(i in corners){
        if(corners.hasOwnProperty(i)){
          center.x += corners[i].x;
          center.y += corners[i].y;
        }
      }
      center.x = center.x*(1/corners.length);
      center.y = center.y*(1/corners.length);
      return center;
    }

    CoordsMather.prototype.sortRectCorners = function(corners){
      if(!(corners.length == 4)) throw Error('wrong corners length');
      var center = this.getMassCenter(corners);
      var top=[],bottom=[], i;
      for(i in corners){
        if(!corners.hasOwnProperty(i)) continue;
        if(corners[i].y < center.y){
          top.push(corners[i]);
        }else{
          bottom.push(corners[i]);
        }
      }
      corners.length = 0;
      if(top[0].x > top[1].x){
        corners.push(top[1]);
          corners.push(top[0]);
      }else{
        corners.push(top[0]);
        corners.push(top[1]);
      }
      if(bottom[0].x < bottom[1].x){
        corners.push(bottom[1]);
        corners.push(bottom[0]);
      }else{
        corners.push(bottom[0]);
        corners.push(bottom[1]);
      }
      return corners;
    }
    //TODO: test parallel, close to parallel, coincident lines
    CoordsMather.prototype.intersect = function (line1, line2){
      var x1 = line1[0].x,
        y1 = line1[0].y,
        x2 = line1[1].x,
        y2 = line1[1].y,
        x3 = line2[0].x,
        y3 = line2[0].y,
        x4 = line2[1].x,
        y4 = line2[1].y;
      var x,y;

      x = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))
        /((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));

      y = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))
        /((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));

      return {x:x, y:y}
    }

    return {
    setSrc: setSrc,
    getImageData: getImageData,
    getRect: getRect,
    createPoint: createPoint,
    getPosition : getPosition,
      sortRectCorners: function(corners){return CoordsMather.prototype.sortRectCorners(corners);}
  }
}]);