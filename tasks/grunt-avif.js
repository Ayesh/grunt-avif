/*
 * grunt-avif
 * https://github.com/Ayesh/grunt-avif
 *
 */
/*
  --quality <int> ............. quality factor (0..63), default 25. 0 is lossless
  --speed (0..8), default 4. 0 is slowest
*/

'use strict';

module.exports = function(grunt) {
    var path = require('path');
    var async = require('async');
    var fs = require('fs');
    grunt.registerMultiTask('avif', "Encode images to AVIF, potentially making them smaller in file size.", function() {
        /**
         * Retrieves defined options.
         */
        var options = this.options();
        grunt.verbose.writeflags(options, 'Options');

        var done = this.async();

        var bin = 'avif';
        if (options.binpath) {
            bin = options.binpath;
        }
        var source_total = 0;
        var dest_total = 0;
        var oversize_total = 0;

        // Iterate over all src-dest file pairs.
        async.eachSeries(this.files, function(f, next) {

            /**
             * Create folder for the dest file
             */
            grunt.file.mkdir(path.dirname(f.dest));
            var args = [];

            if (options.quality) {
                if (options.quality <= 63 && options.quality >= 0) {
                    args.push('--quality');
                    args.push(options.quality);
                }
                else {
                    grunt.fail.warn('Quality must be between 0 and 63');
                }
            }

            if (options.speed) {
                if (options.speed <= 8 && options.speed >= 0) {
                    args.push('--speed');
                    args.push(options.speed);
                }
                else {
                    grunt.fail.warn('Speed value must be between 0 and 8');
                }
            }

            args.push('-e');
            args.push(f.src);

            args.push('-o');
            args.push(f.dest);

            /**
             * Outputs the file that is being analysed.
             */
            grunt.log.subhead('Compressing: ' + f.dest);
            var child = grunt.util.spawn({
                cmd: bin,
                args: args
            }, function(error, result, code) {
                //grunt.log.writeln(code+''+result);
                if (code !== 0) {
                    return grunt.warn(String(code));
                }
                else{
                    var source = fs.statSync(f.src[0])['size'];
                    var dest = fs.statSync(f.dest)['size'];
                    var diff = ((source - dest) / source) * 100;
                    diff = Number((diff).toFixed(2));
                    source_total += source;
                    if (diff < 0) {
                        oversize_total++;
                        source_total += source;
                        diff = diff * -1;
                        if (options.deleteLarger) {
                            grunt.file.delete(f.dest);
                            grunt.log.writeln('Deleted: '['yellow'] + diff + '% larger than its source.');
                        }
                        else {
                            dest_total += dest;
                            grunt.log.writeln('Warning: '['yellow'] + diff + '% larger than its source. Left undeleted.');
                        }
                    }
                    else {
                        dest_total += dest;
                        grunt.log.oklns('Done: '['green'] + diff + '% smaller | ' + diff + '%: ' + source + ' -> ' + dest);
                    }
                }

                next(error);
            });

            /**
             * displays the output and error streams via the parent process.
             */
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);

        }.bind(this), function() {
            var total_diff = (source_total - dest_total) / source_total;
            var total_diff_perentage = Number((total_diff * 100).toFixed(2));
            grunt.log.subhead('Operation statistics:');
            grunt.log.oklns(source_total + ' -> ' + dest_total);
            grunt.log.oklns(total_diff_perentage +'% saved.');
            if (oversize_total !== 0) {
                if (options.deleteLarger) {
                    grunt.log.oklns('Deleted ' + oversize_total + ' file(s) due to larger output.');
                }
                else {
                    grunt.log.oklns('Warning: ' + 'Contains ' + oversize_total + ' file(s) larger than their sources.');
                }
            }
            done();
        });

    });
};
