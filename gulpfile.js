var _ = require('lodash');
var async = require('async');
var clean = require('gulp-clean');
var exec = require('child_process').exec;
var firstline = require('firstline');
var format = require('string-format');
var fs = require('fs');
var gulp = require('gulp');
var gzip = require('gulp-gzip');
var reader = require('line-reader');
var rename = require('gulp-rename');
var semver = require('semver');
var tar = require('gulp-tar');
var shell = require('gulp-shell');

var version;
var title;

format.extend(String.prototype);

function get_changelog(cb) {
    var file = 'docs/CHANGES.txt';
    var counter = 0;
    var lines = [];

    reader.eachLine(file, function(line) {
        counter++;

        var trimmed = line.trim();

        if (counter === 1) {
            return;
        }

        if (line === '') {
            return;
        }

        if (trimmed.startsWith('--')) {
            return false; // stop reading
        } else {
            lines.push(trimmed);
        }
    }, function(err) {
        if (err) {
            cb(err);
        }

        var fixed = [];

        _.each(lines, function(line) {
            if (line.startsWith('*')) {
                fixed.push(line);
            } else {
                fixed[fixed.length - 1] = fixed[fixed.length - 1] + ' ' + line;
            }
        });

        cb(null, fixed);
    });
}

function get_version() {
    var changes = 'docs/CHANGES.txt';

    return firstline(changes);
}

gulp.task('version', function(callback) {
    get_version().then(function(version_string) {
        version = version_string;
        title = 'osdf-{}'.format(version);
        callback();
    });
});

var sources = [
    'README.md',
    '*.js',
    '!gulpfile.js',
    'bin/**',
    'conf/**',
    'debian/**',
    'docs/**',
    'lib/**',
    'logs/**',
    'node_modules/**',
    'test/**',
    'util/**',
    'working/**'
];

// remove the build and dist directories
gulp.task('clean', function() {
    return gulp.src(['build', 'dist'])
        .pipe(clean());
});

gulp.task('build', ['version'], function() {
    return gulp.src(sources, {'base': '.'})
        .pipe(gulp.dest('build/' + title));
});

gulp.task('tar', ['build'], function() {
    return gulp.src('build/' + title + '/**', {'base': 'build'})
        .pipe(tar(title + '.tar'))
        .pipe(gulp.dest('build'));
});

gulp.task('gzip', ['tar'], function() {
    var tarfile = 'build/{}.tar'.format(title);

    return gulp.src(tarfile, {'base': 'build'})
        .pipe(gzip())
        .pipe(gulp.dest('build'));
});

gulp.task('deb_orig_tarball', ['gzip'], function() {
    return gulp.src('build/{}.tar.gz'.format(title))
        .pipe(rename('osdf_{}.orig.tar.gz'.format(version)))
        .pipe(gulp.dest('build'));
});

gulp.task('deb', ['deb_orig_tarball'], function(callback) {
    var debuild = 'debuild -us -uc --lintian-opts ' +
                  '--suppress-tags bad-distribution-in-changes-file';

    var opts = {
        cwd: './build/' + title
    };

    exec(debuild, opts, function(err, stdout, stderr) {
        if (stderr) {
            console.log(stderr);
        }
        callback(err);
    });
});

gulp.task('bump_package_files', ['version'], function(cb) {
    var fs = require('fs');
    var filenames = ['./package.json', 'package-lock.json'];

    async.each(filenames, function(filename, callback) {
        fs.readFile(filename, 'utf-8', function(err, data) {
            var parsed = JSON.parse(data);
            parsed.version = version;

            if (! semver.valid(parsed.version)) {
                callback('Invalid version ' + version);
                return;
            }

            fs.writeFile(filename, JSON.stringify(parsed, null, 4), function(err) {
                if (err) {
                    callback(err);
                } else {
                    console.log('Finished ' + filename);
                    callback();
                }
            });
        });
    }, function(err) {
        cb(err);
    });
});

gulp.task('changes', function(cb) {
    get_changelog(function(err, lines) {
        console.log(lines.join('\n'));
        cb();
    });
});

// Run the unit tests in the test directory.
gulp.task('test', function() {
    var test_scripts = [
        './test/aux-*.js',
        './test/linkage-*.js',
        './test/namespace-*.js',
        './test/node-*.js',
        './test/oql*.js',
        './test/osdf-info.js',
        './test/permissions.js',
        './test/schema-*.js'
    ];
    gulp.src(test_scripts)
        .pipe(shell(['nodeunit <%= file.path %>'],
            {env: {NODE_PATH: '.:./lib'}}
        ));
});

gulp.task('dist', ['deb'], function() {
    var base = 'build/osdf_' + version;
    var tarball = 'build/osdf-{}.tar.gz'.format(version);
    var files = [
        base + '*.buildinfo',
        base + '*.changes',
        base + '*.debian.tar.xz',
        base + '*.deb',
        base + '*.dsc',
        tarball
    ];

    return gulp.src(files)
        .pipe(gulp.dest('dist'));
});


gulp.task('default', ['dist']);
