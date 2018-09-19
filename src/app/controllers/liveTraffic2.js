define([
        'angular',
        'config',
        'app',
        'underscore'
    ],
    function (angular, config, app, _) {
        'use strict';

        var module = angular.module('kibana.controllers');

        module.controller('liveTraffic2Ctrl', function($scope,$window) {
                //console.log("xxxxxxxxxxxxxxxxx"+$window.innerWidth);
                //$scope.viewWidth = window.innerWidth;
                //$scope.viewHeight = window.innerHeight;
                //$scope.liveTrafficeURL = "https://sensiblelog.com/charts.html";
                //angular.element(window).bind('resize', function() {
                //   console.log("yyyyyyyyyxxxxxxxxxxxxxxxxx"+window.innerWidth+","+window.innerHeight);
                   //$scope.viewWidth = window.innerWidth;
                   //$scope.viewHeight = window.innerHeight;

                //});
                $scope.init = function() { };
                $scope.init();

            }
        );

    });