/* global require process */
/* credit to DracoBlue - see
 * http://dracoblue.net/dev/hot-reload-for-nodejs-servers-on-code-change/173/
 */
var child_process = require('child_process')
  , fs = require('fs')
  , util = require('util')
  , dev_server
      = { process: null
        , files: []
        , restarting: false
        , restart: function () {
            this.restarting = true
            util.debug('DEVSERVER: Stopping server for restart')
            this.process.kill()
          }
        , start: function () {
            var that = this
            util.debug('DEVSERVER: Starting server')
            that.watchFiles()
            this.process = child_process.spawn(process.ARGV[0] ,['server.js'])
            this.process.stdout
            .addListener( 'data' ,function (data) {
              process.stdout.write(data)
            })
            this.process.stderr
            .addListener( 'data' ,function (data) {
              util.print(data)
            })
            this.process
            .addListener( 'exit' ,function (code) {
              util.debug('DEVSERVER: Child process exited: '+code)
              this.process = null
              if (that.restarting) {
                that.restarting = true
                that.unwatchFiles()
                that.start()
              }
            })
          }
        , watchFiles: function () {
            var that = this
            child_process
            .exec( 'find -L . | grep -v "[.]git" | grep -v "~"' ,function (error, stdout, stderr) {
              var files = stdout.trim().split("\n")
              files.forEach( function (file) {
                that.files.push(file)
                fs.watchFile( file ,{interval : 500} ,function (curr ,prev) {
                  if ( curr.mtime.valueOf() != prev.mtime.valueOf()
                    || curr.ctime.valueOf() != prev.ctime.valueOf()) {
                    util.debug( 'DEVSERVER: Restarting because of'
                             + ' changed file at ' + file)
                    dev_server.restart()
                  }
                })
              })
            })
          }
        , unwatchFiles: function () {
            this.files.forEach( function (file) {
              fs.unwatchFile(file)
            })
            this.files = []
          }
        }

process.on( 'exit' ,function () {
  dev_server.process.kill()
})

dev_server.start()
