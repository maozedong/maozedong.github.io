'use strict';

var Lib = {};

(function(Lib){

    /**
     * @name add
     * @methodOf Lib
     * @description
     * Adds a function to named queue
     * @param {object} ctx function execution context
     * @param {function} func function to add
     * @param {array} args function arguments
     * @param {string} name optional queue name
     *
     * @public
     */
    Lib.add = function(ctx, func, args, name){
        if (!name) name = 'default';
        var queue = Queue.get(name);
        queue.add(ctx, func, args);
    };

    /**
     * @name stop
     * @methodOf Lib
     * @description
     * Stops queue execution
     * @param {function} cb callback for the 'stopped' event
     * @param {string} name optional queue name
     *
     * @public
     */
    Lib.stop = function(cb, name){
        if (!name) name = 'default';
        var queue = Queue.get(name);
        queue.stop(cb);
    };


    /**
     * @name pause
     * @methodOf Lib
     * @description
     * Pauses queue execution
     * @param {function} cb callback for the 'stopped' event
     * @param {string} name optional queue name
     *
     * @public
     */
    Lib.pause = function(cb, name){
        if (!name) name = 'default';
        var queue = Queue.get(name);
        queue.pause(cb);
    };


    /**
     * @name run
     * @methodOf Lib
     * @description
     * Starts queue execution
     * @param {string} name optional queue name
     * @param {number} index optional queue start index
     *
     * @public
     */
    Lib.run = function(name, index){
        if (!name) name = 'default';
        if (isInt(index)) --index;
        var queue = Queue.get(name);
        queue.run(index);
    };

    var queues = [];

    var Queue = function(name){
        this.name = name;
        this.running = null;
        this.queued = [];
        this.current = -1;
        this.paused = true;
        this.pausedCb = null;
    };

    Queue.get = function(name) {
        var queue = queues[name];
        if (!queue) queue = queues[name] = new Queue(name);
        return queue;
    };

    Queue.prototype.add = function(_this, func, args){
        var ctx = args.shift(),
            callback = args.shift(),
            that = this;

        args.unshift(function() {
            console.log(arguments);
            callback.apply(ctx, arguments);
            that.next(arguments[0]);
        });

        args.unshift(ctx);

        var task = function(err) {
            if (err instanceof Error) callback.call(global, err);
            else func.apply(_this, args);
        };

        this.queued.push(task);
    };

    Queue.prototype.next = function (err) {
        if(!this.paused) {
            var run = this.running = this.queued[++this.current];
            if (run) run(err);
        }else if (typeof this.pausedCb === 'function'){
            console.log( this.name, 'stopped');
            this.pausedCb();
        }
    };

    Queue.prototype.run = function(index){
        if (this.paused){
            this.paused = false;
            this.current = isInt(index) ? index : this.current;
            var run = this.running = this.queued[++this.current];
            if (run) {
                run();
                console.log(this.name, 'started');
            }
        }
    };

    Queue.prototype.stop = function(cb){
        this.current = -1;
        this.pause(cb);
    };

    Queue.prototype.pause = function(cb){
        console.log(this.name, 'stopping...');
        this.pausedCb = cb;
        this.paused = true;
    };

    function isInt(n){
        return Number(n)===n && n%1===0;
    }

    return Lib;
})(Lib);
