/*global module:false*/
module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      basic_and_extras: {
        files: {
          'js/deck/dist/onslyde-deck-1.0.0.js': ['js/deck/libs/canvas2blob.js','js/deck/libs/html2canvas.js','js/deck/deck.js','js/deck/onslyde-1.0.0.deck.js'],
          //core is used only in the remote for init
          'js/deck/dist/onslyde-core-1.0.0.js': ['js/deck/onslyde-1.0.0.deck.js'],
          'js/deck/dist/onslyde-remote-1.0.0.js': ['js/deck/gracefulWebSocket.js','js/deck/remote.js']
        }
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      primary : {
        files: {
          'js/deck/dist/onslyde-remote-1.0.0.min.js': ['js/deck/dist/onslyde-remote-1.0.0.js'],
          'js/deck/dist/onslyde-core-1.0.0.min.js': ['js/deck/dist/onslyde-core-1.0.0.js'],
          'js/deck/dist/onslyde-deck-1.0.0.min.js': ['js/deck/dist/onslyde-deck-1.0.0.js']
        }
      }
    },
    watch: {
      files: [
        'js/deck/*.js',
        '!js/deck/dist/*.js'],
      tasks: ['default']
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: false,
        boss: true,
        eqnull: true,
        globals: {
          jQuery: true,
          'gapi' : true,
          '_gaq': true,
          'speak': true,
          'ws': true,
          window: true,
          document: true,
          onslyde: true,
          userObject: true,
          localStorage: true,
          WebSocket: true,
          setTimeout: true,
          clearTimeout: true,
          setInterval: true,
          clearInterval: true,
          XMLHttpRequest: true,
          location: true,
          console: true,
          navigator: true,
          getAttendees: true,
          scrollTo: true,
          confirm: true,
          alert: true,
          Worker: true,
          $: true,
          barChart: true,
          Image: true,
          wsf: true,
          html2canvas: true,
          gShowController: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['js/deck/*.js']
      }
    }

  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.loadNpmTasks('grunt-shell');

  // Default task.
  grunt.registerTask('dev', ['watch']);
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};
