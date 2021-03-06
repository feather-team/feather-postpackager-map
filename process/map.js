module.exports = function(ret, conf, setting, opt){
    var featherMap = ret.feather;
    var resources = featherMap.resource, deps = featherMap.deps, async = featherMap.async, urls = featherMap.urlMap, components = featherMap.components;

    var hash = {map: {}}, modulename = feather.config.get('project.modulename');

    feather.util.map(urls, function(subpath, item){
        if(modulename && item.moduleName != modulename) return;

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
                //_.url = urls[item.pkg].md5Url;
                _.url = item.md5Url;
                _.pkg = item.pkg;
            }else{
                _.url = item.md5Url;
            }

            if(item.isMod){
                _.isMod = 1;

                if(item.isComponentLike){
                    _.isComponent = 1;
                }
            }
        }

        if(deps[subpath] && deps[subpath].length){
            _.deps = deps[subpath];
        }

        if(async[subpath] && async[subpath].length){
            _.async = async[subpath];
        }

        if(!feather.util.isEmptyObject(_)){
            hash.map[subpath] = _;
        }
    });

    var modulename = feather.config.get('project.modulename');

    if(!modulename || modulename == 'common'){
        hash.commonMap = featherMap.commonResource;
        hash.useRequire = feather.config.get('require.use');
    }

    var file = feather.file.wrap(feather.project.getProjectPath() + '/map/' + (modulename || 'map') + '.php');
    file.setContent("<?php\r\nreturn " + feather.util.toPhpArray(hash) + ";");
    ret.pkg[file.subpath] = file;
};