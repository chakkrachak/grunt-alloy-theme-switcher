/*
 * grunt-alloy-theme-switcher
 * https://github.com/CanalTP/grunt-alloy-theme-switcher
 *
 * Copyright (c) 2015 Canal TP
 * Licensed under the AGPL license.
 */

'use strict';

module.exports = function(grunt) {
    var fs = require('fs');
    var chalk = require('chalk');
    var utils = require('../lib/utils.js');
    var _ = require('underscore');

    var _findAndroidNodeByAttribute = function(node) {
        return node.hasAttribute('android:name') && node.getAttribute('android:name').indexOf(this.attributeName) !== -1;
    };

    var _updateManifest = function(tiapp, config) {
        if (config.android) {
            var manifests = tiapp.doc.getElementsByTagName('manifest');
            if (manifests.length !== 1) {
                console.log(chalk.red('No manifest tag found in your tiapp.xml.'));
                return false;
            } else {
                var manifest = manifests[0];
                // Update versionCode
                if (config.android.versionCode) {
                    manifest.setAttribute('android:versionCode', config.android.versionCode);
                    manifest.setAttribute('android:versionName', tiapp.version);
                    console.log(chalk.green('\nandroid:version Code and versionName updated'));
                }
                if (config.android.MAPS_V2_API_KEY) {
                    // Update gmaps api key
                    var metaDatas = manifest.getElementsByTagName('meta-data');
                    var metaData = _.find(metaDatas, _findAndroidNodeByAttribute, {attributeName: 'com.google.android.maps.v2.API_KEY'});
                    if (metaData) {
                        metaData.setAttribute('android:value', config.android.MAPS_V2_API_KEY);
                        console.log(chalk.green('\ncom.google.android.maps.v2.API_KEY updated'));
                    }
                    // Update app id in permission MAPS_RECEIVE
                    var permissions = manifest.getElementsByTagName('permission');
                    var permission = _.find(permissions, _findAndroidNodeByAttribute, {attributeName: '.permission.MAPS_RECEIVE'});
                    if (permission) {
                        permission.setAttribute('android:name', tiapp.id + '.permission.MAPS_RECEIVE');
                        console.log(chalk.green('\npermission .permission.MAPS_RECEIVE updated'));
                    }
                    // Update app id in uses-permission MAPS_RECEIVE
                    var usesPermissions = manifest.getElementsByTagName('uses-permission');
                    var usesPermission = _.find(usesPermissions, _findAndroidNodeByAttribute, {attributeName: '.permission.MAPS_RECEIVE'});
                    if (usesPermission) {
                        usesPermission.setAttribute('android:name', tiapp.id + '.permission.MAPS_RECEIVE');
                        console.log(chalk.green('\nuses-permission .permission.MAPS_RECEIVE updated'));
                    }
                }
                console.log(chalk.green('\nAndroid manifest generated'));
                return true;
            }
        } else {
            console.log(chalk.yellow('No android configuration found for ' + grunt.option('theme') + '!'));
            return true;
        }
    };

    var _addIosConfigurationSpecificParameters = function(tiappDocumentElement, appId, appName) {
        var plist = require('plist-native');
        var slug = require('slug');
        slug.defaults.mode = 'rfc3986';
        var DOMParser = require('xmldom').DOMParser;

        var plistXmlNode = tiappDocumentElement
            .getElementsByTagName('ios')[0]
            .getElementsByTagName('plist')[0];
        var iOSConfigurationPlist = plist.parseString(plistXmlNode.toString());

        iOSConfigurationPlist.CFBundleURLTypes = [
            {
                CFBundleURLName: appId,
                CFBundleURLSchemes: [slug(appName)],
            },
        ];

        var updatedIosPlistXmlDoc = new DOMParser().parseFromString(plist.buildString(iOSConfigurationPlist), 'text/xml');
        tiappDocumentElement.replaceChild(updatedIosPlistXmlDoc.documentElement, plistXmlNode);
    };

    grunt.registerTask('update_tiapp', 'Update the tiapp xml according to theme configuration', function() {
        // Read theme's config
        var themeConfig = utils.getThemeConfig(grunt);

        if (themeConfig) {
            // Load tiapp
            var tiapp = require('tiapp.xml').load('./tiapp.xml');

            _addIosConfigurationSpecificParameters(tiapp.doc.documentElement, tiapp.id, tiapp.name);

            for (var setting in themeConfig.settings) {
                tiapp[setting] = themeConfig.settings[setting];
                grunt.log.ok('Changing setting ' + chalk.cyan(setting) + ' to ' + chalk.yellow(themeConfig.settings[setting]));
            }
            for (var property in themeConfig.properties) {
                tiapp.setProperty(
                    themeConfig.properties[property].name,
                    themeConfig.properties[property].value,
                    themeConfig.properties[property].type
                );
                grunt.log.ok(
                    'Set property ' + chalk.cyan(themeConfig.properties[property].name) +
                    ' with value ' + chalk.yellow(themeConfig.properties[property].value)
                );
            }
            if (_updateManifest(tiapp, themeConfig) || themeConfig.settings.length > 0 || themeConfig.properties.length > 0) {
                tiapp.write();
                grunt.log.ok(chalk.green('\nTiApp.xml updated\n'));
            } else {
                grunt.fail.warn('TiApp.xml not updated.');
            }
        }
    });
};