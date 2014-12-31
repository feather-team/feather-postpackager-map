//staticMode 模式的map策略
//autocombine以及静态资源内联

function pack(ret, file, rs, opt){
    var urlMap = ret.feather.urlMap, autoCombine = feather.config.get('autoCombine');

    ['headJs', 'bottomJs', 'css'].forEach(function(type){
        var resources = rs[type], noPkgs = [];

        if(!resources) return;

        for(var i = 0; i < resources.length; i++){
            var resource = resources[i], info = urlMap[resource];

            if(info){
                if(info.pkg){
                    resources[i] = urlMap[info.pkg].domainUrl;
                }else{
                    if(autoCombine){
                        noPkgs.push(resource);
                    }else{
                        resources[i] = info.domainUrl;
                    }
                }
            }
        }

        if(noPkgs.length > 1){
            var content = '';

            noPkgs.forEach(function(pkg){
                content += ret.src[pkg].getContent() + '\r\n';
            });

            var path = '/static/combine/' + feather.util.md5(file.subpath, 10) + '.' + (type == 'css' ? 'css' : 'js');
            var pkgFile = new feather.file(feather.project.getProjectPath() + path);
            pkgFile.setContent(content);

            ret.pkg[path] = pkgFile;
            resources[resources.indexOf(noPkgs[0])] = pkgFile.getUrl(opt.md5, opt.domain)

            for(var i = 1; i < noPkgs.length; i++){
                resources.splice(resources.indexOf(noPkgs[i]), 1);
            }
        }else if(noPkgs.length == 1){
            resources[resources[noPkgs[0]]] = urlMap[noPkgs[0]].domainUrl;
        }
    });

    return rs;
}

function getStaticRequireMapAndDeps(ret, deps, maps){
    var mapResult = {}, depResult = {}, tmpDeps = [], r = {};

    (deps || []).forEach(function(m){
        var v = maps[m], url, dep;

        if(v){  
            if(v.pkg){
                url = maps[v.pkg].md5Url;
            }else{
                url = v.md5Url;
            }

            dep = ret.feather.deps[m];

            if(!mapResult[url]){
                mapResult[url] = [];
            }

            mapResult[url].push(m);

            if(v.isMod){
                if(dep){
                    depResult[m] = dep;
                }
            }

            if(dep){
                tmpDeps = tmpDeps.concat(dep);
            }
        }
    });

    if(tmpDeps.length > 0){
        var md = getStaticRequireMapAndDeps(ret, tmpDeps, maps);

        feather.util.map(md.map, function(key, ms){
            mapResult[key] = feather.util.unique(ms.concat(mapResult[key] || []));
        });

        feather.util.map(md.deps, function(key, ms){
            depResult[key] = feather.util.unique(ms.concat(depResult[key] || []));
        });
    }

    return {map: mapResult, deps: depResult};
}

function getAllResource(resources, urls, deps){
    var tmp = [];

    resources.forEach(function(resource){
        var _ = urls[resource];

        if(_){
            tmp.push(_.domainUrl);
            
            if(deps[resource]){
                tmp = getAllResource(deps[resource], urls, deps).concat(tmp);
            }
        }else{
            tmp.push(resource);
        }
    })

    return feather.util.unique(tmp);
}

module.exports = function(ret, conf, setting, opt){
	var featherMap = ret.feather;
    var resources = featherMap.resource, deps = featherMap.deps, urls = featherMap.urlMap, commonMap = featherMap.commonResource;

    feather.util.map(ret.src, function(subpath, file){
        if(file.isHtmlLike){
            var resource = featherMap.resource[subpath], content = file.getContent();

            if(opt.pack){
                resource = pack(ret, file, resource, opt);
            }

            var head = '', bottom = '', css = resource.css || [], headJs = resource.headJs || [], bottomJs = resource.bottomJs || [];

            if(!file.isPageletLike){
                css.unshift.apply(css, commonMap.css);
                headJs.unshift.apply(headJs, commonMap.headJs);
                bottomJs.unshift.apply(bottomJs, commonMap.bottomJs);
            }  

            getAllResource(css, urls, deps).forEach(function(css){
                head += '<link rel="stylesheet" href="' + css + '" type="text/css" />';
            });

            getAllResource(headJs, urls, deps).forEach(function(js){
                head += '<script src="' + js + '"></script>';
            });

            var md = getStaticRequireMapAndDeps(ret, deps[subpath], urls);
            
            if(!file.isPageletLike){
                var domain = feather.config.get('require.config.domain', feather.config.get('roadmap.domain'));

                if(domain){
                    md.domain = domain;
                }
            }
            	
            head += '<script>require.mergeConfig(' + feather.util.json(md) + ')</script>';
            
            getAllResource(bottomJs, urls, deps).forEach(function(js){
                bottom += '<script src="' + js + '"></script>';
            });

            if(!file.isPageletLike){
                if(/<\/head>/.test(content)){
                    content = content.replace(/<\/head>/, function(){
                        return head + '</head>';
                    });
                }else{
                    content = head + content;
                }
                
                if(/<\/body>/.test(content)){
                    content = content.replace(/<\/body>/, function(){
                        return bottom + '</body>';
                    });
                }else{
                    content += bottom;
                }
            }else{
                content = head + content + bottom;
            }

            file.setContent(content);
        }
    });
};