var child_process = require('child_process');
var fs = require('fs');

function serializeMap(hash){
    var dir = feather.project.getTempPath() + '/map';
    var time = Date.now(), filename = dir + '/map' + time;
    var php = filename + '.php', done = filename + '.done', output = filename + '.output';
    
    feather.util.mkdir(dir);

    hash = feather.util.toPhpArray(hash);

    feather.util.write(php, '<?php echo "<?php\r\n return ";var_export(' + hash + ');echo ";";');
    child_process.exec('php ' + php + '>' + output + '& echo done!>' + done);

    while(!fs.existsSync(done)){}

    var content = fs.readFileSync(output);

    // fs.unlinkSync(output);
    fs.unlinkSync(php);
    fs.unlinkSync(done);

    return content;
}

module.exports = function(ret, conf, setting, opt){
    var featherMap = ret.feather;
    var resources = featherMap.resource, deps = featherMap.deps, urls = featherMap.urlMap, components = featherMap.components;
    var hash = {map: {}}, modulename = feather.config.get('project.modulename');

    feather.util.map(urls, function(subpath, item){
        if(modulename && item.moduleName != modulename || item.isPkg) return;

        var _ = {};

        if(item.isHtmlLike){
            if(components[subpath]){
                _.components = components[subpath];
            }

            ['headJs', 'bottomJs', 'css'].forEach(function(type){
                if(resources[subpath][type]){
                    _[type] = resources[subpath][type];
                }
            });

            if(item.isPageletLike){
                _.isPagelet = 1;
            }
        }else{
            if(item.pkg){
                _.url = urls[item.pkg].md5Url;
            }else{
                _.url = item.md5Url;
            }

            if(item.isMod){
                _.isMod = 1;
            }
        }

        if(deps[subpath] && deps[subpath].length){
            _.deps = deps[subpath];
        }

        if(!feather.util.isEmptyObject(_)){
            hash.map[subpath] = _;
        }
    });

    var modulename = feather.config.get('project.modulename');

    if(!modulename || modulename == 'common'){
        var config = feather.config.get('require.config') || {};
        hash.requireConfig = require('uglify-js').minify('_=' + feather.util.json(config), {fromString: true}).code.substring(2);
        hash.commonMap = featherMap.commonResource;
    }

    var file = feather.file.wrap(feather.project.getProjectPath() + '/map/' + feather.config.get('project.ns') + '/' + (modulename || 'map') + '.php');
    file.setContent(serializeMap(hash));

    ret.pkg[file.subpath] = file;
};