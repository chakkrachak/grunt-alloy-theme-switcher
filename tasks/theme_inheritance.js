/*
 * grunt-alloy-theme-switcher
 * https://github.com/CanalTP/grunt-alloy-theme-switcher
 *
 * Copyright (c) 2015 Canal TP
 * Licensed under the AGPL license.
 */

'use strict';

module.exports = function(grunt) {

    var fs = require("fs"),
    extend = require("extend"),
    chalk = require("chalk"),
    utils = require("../lib/utils.js"),
    existingThemes = [],
    themesTree = [],
    foldersToCopy = [{folder:'/assets', ext:'*'}, {folder:'/styles', ext:'tss'}, {folder:'/i18n', ext:'xml'}, {folder:'/platform', ext:'*'}],
    mergedThemeName = 'mergedTheme',
    mergedThemeConfig = {},
    mergedThemePath;

    var _constructThemesTree = function(themeConfig){
        if (themeConfig && themeConfig.baseTheme) {
            if (existingThemes.indexOf(themeConfig.baseTheme) !== -1 && themesTree.indexOf(themeConfig.baseTheme) === -1) {
                themesTree.push(themeConfig.baseTheme);
                _constructThemesTree(utils.getThemeConfig(grunt, themeConfig.baseTheme));
            } else {
                grunt.fail.fatal(chalk.red("The baseTheme " + themeConfig.baseTheme + " provided in theme.json was not found."));
            }
        }
    };

    var _mergeThemes = function(){
        if (themesTree.length !== 0) {
            var themeToMerge = themesTree.pop();
            var themePathToMerge = grunt.option('themes_folder') + themeToMerge;
            // copy views and tss files into merged theme
            foldersToCopy.forEach(function(element, index){
                if (grunt.file.exists(themePathToMerge + element.folder) && grunt.file.isDir(themePathToMerge + element.folder)) {
                    grunt.file.expand(themePathToMerge + element.folder + '/**/*.' + element.ext).forEach(function(filepath){
                        grunt.file.copy(filepath, filepath.replace(themeToMerge, mergedThemeName));
                    });
                }
            });
            // copy widgets folder
            var widgetsFolder = '/widgets';
            if (grunt.file.exists(themePathToMerge + widgetsFolder) && grunt.file.isDir(themePathToMerge + widgetsFolder)) {
                grunt.file.expand({filter:'isFile'}, themePathToMerge + widgetsFolder + '/**').forEach(function(filepath){
                    grunt.file.copy(filepath, filepath.replace(themeToMerge, mergedThemeName));
                });
            }
            // merge theme json
            var configToMerge = utils.getThemeConfig(grunt, themeToMerge);
            if (configToMerge) {
                mergedThemeConfig = extend(true, mergedThemeConfig, configToMerge);
                if (mergedThemeConfig.baseTheme) {
                    delete mergedThemeConfig.baseTheme;
                }
            }
            _mergeThemes();
        }
    };

    grunt.registerTask('extendTheme', 'Check if a theme inherits from another and if so generate the resulting theme', function() {
        existingThemes = grunt.config.get('prompt.choose_theme.options.questions')[0].choices;
        themesTree = [];
        themesTree.push(grunt.option("theme"));
        var themeConfig = utils.getThemeConfig(grunt);
        _constructThemesTree(themeConfig);
        if (themesTree.length > 1){
            grunt.log.ok(chalk.underline.bold("Themes inheritance tree:") + " " + chalk.cyan(themesTree.join(' -> ')));
            // create a Temp directory for resulting merge of themes
            mergedThemePath = grunt.option('themes_folder') + mergedThemeName;
            if (grunt.file.exists(mergedThemePath)) {
                grunt.file.delete(mergedThemePath);
            }
            mergedThemeConfig = {};
            grunt.file.write(mergedThemePath + "/theme.json", JSON.stringify(mergedThemeConfig));
            _mergeThemes();
            grunt.log.debug("theme.json wrote after inheritance: " + JSON.stringify(mergedThemeConfig));
            grunt.file.write(mergedThemePath + "/theme.json", JSON.stringify(mergedThemeConfig));
            grunt.option("theme", mergedThemeName);
            grunt.log.ok("Switched to theme " + mergedThemeName + " before update tiapp and merging i18n files");
        } else {
            grunt.log.ok("No inheritance settings found.");            
        }
    });
    
};
