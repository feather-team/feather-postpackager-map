'use strict';

module.exports = function(ret, conf, setting, opt){
    //process start
    var process = [];

    if(feather.config.get('staticMode')){
        process.push('static-map');
    }else{
        process.push('map');
    }

    process.forEach(function(process){
        require('./process/' + process + '.js')(ret, conf, setting, opt); 
    });

    var modulename = feather.config.get('project.modulename'), ns = feather.config.get('project.ns');

    if(modulename){
        //write release json
        var path = feather.project.getTempPath() + '/release/' + ns + '/' + modulename + '.json';
        var content = JSON.stringify(ret.feather);
        feather.util.write(path, content);
    }
};